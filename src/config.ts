/**
 * Configuration loading and validation
 * @module
 */

import { isMap, isScalar, isSeq, LineCounter, parseDocument } from "yaml";
import { fromError } from "zod-validation-error";
import type { EnvConfig, LabelConfig } from "./domain/types.ts";
import { labelConfig } from "./schema.ts";

/** Default config file path */
const DEFAULT_CONFIG_PATH = ".github/labels.yml";

/** Flags that expect a value argument */
const FLAGS_WITH_VALUES = ["--config"] as const;

/**
 * Custom error for configuration issues
 */
export class ConfigError extends Error {
  constructor(message: string, public showHelp = false) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Thrown when --help or -h flag is provided
 */
export class HelpRequested extends Error {
  constructor() {
    super("Help requested");
    this.name = "HelpRequested";
  }
}

/**
 * Type guard to validate LabelConfig schema using Zod
 */
export function isLabelConfig(obj: unknown): obj is LabelConfig {
  return labelConfig.safeParse(obj).success;
}

/**
 * Parse a flag value from args, supporting both --flag value and --flag=value
 */
function parseFlagValue(
  args: string[],
  flag: string,
  defaultValue: string,
): string {
  // Check --flag=value format
  const eqArg = args.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) {
    return eqArg.slice(flag.length + 1);
  }

  // Check --flag value format
  const idx = args.indexOf(flag);
  if (idx !== -1) {
    const next = args[idx + 1];
    if (next && !next.startsWith("-")) {
      return next;
    }
  }

  return defaultValue;
}

/**
 * Extract positional arguments (excluding flags and their values)
 */
function getPositionalArgs(args: string[]): string[] {
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Skip --flag=value format
    if (arg.includes("=") && arg.startsWith("-")) {
      continue;
    }

    // Skip flags
    if (arg.startsWith("-")) {
      // Skip next arg if this flag expects a value
      if (
        FLAGS_WITH_VALUES.includes(arg as (typeof FLAGS_WITH_VALUES)[number])
      ) {
        i++;
      }
      continue;
    }

    positional.push(arg);
  }

  return positional;
}

/** Options for getEnv to allow explicit args/env for testing */
export interface GetEnvOptions {
  /** CLI arguments (defaults to Deno.args) */
  args?: string[];
  /** Environment variable getter (defaults to Deno.env.get) */
  envGet?: (key: string) => string | undefined;
}

/**
 * Parse command line arguments and environment variables
 * @param options - Optional explicit args/env for testing without global mutation
 * @throws {ConfigError} If required configuration is missing or invalid
 */
export function getEnv(options?: GetEnvOptions): EnvConfig {
  const args = options?.args ?? Deno.args;
  const envGet = options?.envGet ?? ((k: string) => Deno.env.get(k));

  // Handle help flag - let CLI handle display
  if (args.includes("--help") || args.includes("-h")) {
    throw new HelpRequested();
  }

  // Token is required
  const token = envGet("GITHUB_TOKEN");
  if (!token) {
    throw new ConfigError("GITHUB_TOKEN is required");
  }

  // Config path: CLI flag > env > default
  const configPath = parseFlagValue(
    args,
    "--config",
    envGet("CONFIG_PATH") ?? DEFAULT_CONFIG_PATH,
  );

  // Get positional arguments
  const positional = getPositionalArgs(args);
  const repoArg = positional[0] ?? envGet("REPO");

  // Validate repo
  if (!repoArg) {
    throw new ConfigError(
      "Repository required. Usage: github-labelmanager OWNER/REPO",
      true,
    );
  }

  const parts = repoArg.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ConfigError("Invalid repository format. Expected: owner/repo");
  }
  const [owner, repo] = parts;

  // Dry run mode
  const dryRun = envGet("DRY_RUN") === "true" || args.includes("--dry-run");

  return {
    token,
    owner,
    repo,
    dryRun,
    configPath,
  };
}

/**
 * Load and validate labels config from YAML file
 * @param path - Path to config file (optional, uses CONFIG_PATH env or default)
 * @throws {Deno.errors.NotFound} If config file not found
 * @throws {Error} If config file is invalid
 */
export async function loadConfig(path?: string): Promise<LabelConfig> {
  const configPath = path ?? Deno.env.get("CONFIG_PATH") ?? DEFAULT_CONFIG_PATH;

  let configContent: string;
  try {
    configContent = await Deno.readTextFile(configPath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Deno.errors.NotFound(`Config file not found: ${configPath}`);
    }
    throw new Error(`Failed to read config file: ${configPath}: ${err}`);
  }

  // Parse with line tracking for annotations
  const lineCounter = new LineCounter();
  const doc = parseDocument(configContent, { lineCounter });

  // Check for parse errors
  if (doc.errors.length > 0) {
    throw new Deno.errors.InvalidData(
      `YAML parse error: ${doc.errors[0].message}`,
    );
  }

  const parsed = doc.toJS() as Record<string, unknown>;

  // Validate with Zod
  const validation = labelConfig.safeParse(parsed);

  if (!validation.success) {
    const validationError = fromError(validation.error);
    throw new Deno.errors.InvalidData(
      `Invalid labels.yml schema:\n${validationError.toString()}`,
    );
  }

  // Build line number maps for annotations
  const labelLines: Record<string, number> = {};
  const deleteLines: Record<string, number> = {};

  // Extract line numbers for labels
  const labelsNode = doc.get("labels", true);
  if (isSeq(labelsNode)) {
    for (const item of labelsNode.items) {
      if (isMap(item)) {
        const nameNode = item.get("name", true);
        if (isScalar(nameNode) && nameNode.range) {
          const value = nameNode.value;
          if (value == null) continue;
          const name = typeof value === "string" ? value : String(value);
          labelLines[name] = lineCounter.linePos(nameNode.range[0]).line;
        }
      }
    }
  }

  // Extract line numbers for delete entries
  const deleteNode = doc.get("delete", true);
  if (isSeq(deleteNode)) {
    for (const item of deleteNode.items) {
      if (isScalar(item) && item.range) {
        const value = item.value;
        if (value == null) continue;
        const name = typeof value === "string" ? value : String(value);
        deleteLines[name] = lineCounter.linePos(item.range[0]).line;
      }
    }
  }

  // Attach metadata via spread to avoid mutating validation.data
  return {
    ...validation.data,
    _meta: { filePath: configPath, labelLines, deleteLines },
  } as LabelConfig;
}
