#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { Octokit } from "@octokit/core";
import { parse } from "@std/yaml";

// --- Types ---

interface LabelConfig {
  labels: {
    name: string;
    color: string;
    description: string;
    aliases?: string[];
  }[];
  delete?: string[];
}

/** Interface based on GitHub API specs */
interface LabelOptions {
  /** The name of the label */
  name: string;
  /** The color of the label as 6 character hex code, without '#' */
  color?: string;
  /** The description of the label */
  description?: string;
  /** Optional: The new name of the label */
  new_name?: string; // Used only for updates
}

interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

interface EnvConfig {
  token: string;
  owner: string;
  repo: string;
  dryRun: boolean;
}

// --- Configuration & Utilities ---

const getEnv = (): EnvConfig => {
  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.log(`
Usage: deno task labels [OWNER/REPO] [OPTIONS]

Options:
  --dry-run      Run without making changes to GitHub
  --help, -h     Show this help message

Environment Variables:
  GITHUB_TOKEN   Required. GitHub Personal Access Token
  REPO           Optional. Repository in 'owner/repo' format (if not provided as argument)
`);
    Deno.exit(0);
  }

  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("❌ GITHUB_TOKEN is required.");
    Deno.exit(1);
  }

  // Try to get repo from args first, then env
  const repoArg = Deno.args[0] ?? Deno.env.get("REPO");
  if (!repoArg?.includes("/")) {
    console.error("❌ Usage: deno task labels OWNER/REPO");
    console.error("   Or set REPO environment variable (e.g. 'owner/repo')");
    Deno.exit(1);
  }

  const [owner, repo] = repoArg.split("/");
  const dryRun = Deno.env.get("DRY_RUN") === "true" ||
    Deno.args.includes("--dry-run");

  return {
    token,
    owner,
    repo,
    dryRun,
  };
};

// 1. Define pure ANSI codes (no symbols inside)
const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

// 2. Check if we should disable color (Standard CI/CD practice)
// In Deno: Deno.noColor, In Node: process.env.NO_COLOR
const isNoColor = typeof Deno !== "undefined" ? Deno.noColor : false;

// 3. Define the Schema for your logs
const LOG_LEVELS = {
  info: { color: COLORS.cyan, symbol: "ℹ" },
  success: { color: COLORS.green, symbol: "✔" },
  warn: { color: COLORS.yellow, symbol: "⚠" },
  error: { color: COLORS.red, symbol: "✖" },
  skip: { color: COLORS.gray, symbol: "→" },
} as const;

type LogType = keyof typeof LOG_LEVELS;

// 4. The "Pro" Logger
const logger = (Object.keys(LOG_LEVELS) as LogType[]).reduce((acc, level) => {
  const { color, symbol } = LOG_LEVELS[level];

  acc[level] = (msg: string) => {
    // If no color, just print symbol + message
    const prefix = isNoColor ? symbol : `${color}${symbol}${COLORS.reset}`;

    console.log(`${prefix}  ${msg}`);
  };

  return acc;
}, {} as Record<LogType, (msg: string) => void>);

// --- GitHub API Client ---
class LabelManager {
  private octokit: Octokit;
  private env: EnvConfig;

  constructor(env: EnvConfig) {
    this.env = env;
    this.octokit = new Octokit({
      auth: env.token,
      request: {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    });
  }

  // 1. LIST all labels
  async list(page = 1): Promise<GitHubLabel[]> {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/labels",
        {
          owner: this.env.owner,
          repo: this.env.repo,
          per_page: 100,
          page,
        },
      );

      const pageLabels = data.map((l) => ({
        name: l.name,
        color: l.color,
        description: l.description,
      }));

      if (pageLabels.length < 100) return pageLabels;
      return [...pageLabels, ...(await this.list(page + 1))];
    } catch (error) {
      this.handleError("List", error);
      return [];
    }
  }

  // 2. GET a single label
  async get(name: string) {
    console.log(`\n🔍 Looking up label: ${name}`);
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/labels/{name}",
        {
          owner: this.env.owner,
          repo: this.env.repo,
          name,
        },
      );
      return data;
    } catch (error) {
      this.handleError("Get", error);
    }
  }

  // 3. CREATE a label
  async create(options: LabelOptions) {
    if (this.env.dryRun) {
      return;
    }

    try {
      const { data } = await this.octokit.request(
        "POST /repos/{owner}/{repo}/labels",
        {
          owner: this.env.owner,
          repo: this.env.repo,
          name: options.name,
          color: options.color
            ? String(options.color).replace(/^#/, "")
            : undefined,
          description: options.description,
        },
      );
      return data;
    } catch (error) {
      this.handleError("Create", error);
    }
  }

  // 4. UPDATE a label
  async update(currentName: string, options: LabelOptions) {
    if (this.env.dryRun) {
      return;
    }

    try {
      const { data } = await this.octokit.request(
        "PATCH /repos/{owner}/{repo}/labels/{name}",
        {
          owner: this.env.owner,
          repo: this.env.repo,
          name: currentName,
          new_name: options.new_name,
          color: options.color
            ? String(options.color).replace(/^#/, "")
            : undefined,
          description: options.description,
        },
      );
      return data;
    } catch (error) {
      this.handleError("Update", error);
    }
  }

  // 5. DELETE a label
  async delete(name: string) {
    if (this.env.dryRun) {
      return;
    }

    try {
      await this.octokit.request("DELETE /repos/{owner}/{repo}/labels/{name}", {
        owner: this.env.owner,
        repo: this.env.repo,
        name,
      });
    } catch (error) {
      this.handleError("Delete", error);
    }
  }

  private handleError(action: string, error: unknown) {
    const isOctokitLike = (
      e: unknown,
    ): e is {
      status?: number;
      message?: string;
      response?: { data?: { message?: string } };
    } => typeof e === "object" && e !== null;

    if (isOctokitLike(error)) {
      const status = error.status ?? "unknown";
      const message = error.message ?? JSON.stringify(error);
      // 404 is expected if we try to update/delete something that doesn't exist, but we shouldn't be doing that if we list first.
      logger.error(`${action} Failed: ${status} - ${message}`);
      if (error.response?.data?.message) {
        console.error(`   API Message: ${error.response.data.message}`);
      }
    } else {
      logger.error(`${action} Failed: ${error}`);
    }
  }
}

// --- Main Logic ---

async function main() {
  const env = getEnv();
  const manager = new LabelManager(env);

  console.log(`\n📦 Syncing labels for ${env.owner}/${env.repo}`);
  if (env.dryRun) console.log("🚧 DRY RUN MODE ENABLED\n");

  // Load Config
  let config: LabelConfig = { labels: [] };
  try {
    const configPath = new URL("./.github/labels.yml", import.meta.url);
    const configContent = await Deno.readTextFile(configPath);
    config = parse(configContent) as LabelConfig;
  } catch (err) {
    console.error("❌ Failed to load .github/labels.yml");
    console.error(err);
    Deno.exit(1);
  }

  // Fetch current state
  const currentLabels = await manager.list();
  const existingMap = new Map(currentLabels.map((l) => [l.name, l]));

  // 1. Process Desired Labels (Create, Update, Rename)
  for (const desired of config.labels) {
    const cleanColor = String(desired.color)
      .replace(/^#/, "")
      .toLowerCase()
      .padStart(6, "0");

    // A. Check for Renames (Aliases)
    let matchedName = desired.name;
    if (!existingMap.has(desired.name) && desired.aliases) {
      for (const alias of desired.aliases) {
        if (existingMap.has(alias)) {
          logger.warn(`Renaming:   "${alias}" -> "${desired.name}"`);
          await manager.update(alias, {
            name: alias,
            new_name: desired.name,
            color: desired.color,
            description: desired.description,
          });

          // Update local map to reflect the change for subsequent checks
          const movedLabel = existingMap.get(alias)!;
          existingMap.delete(alias);
          existingMap.set(desired.name, { ...movedLabel, name: desired.name });
          matchedName = desired.name; // Label is now present under new name
          break;
        }
      }
    }

    // B. Create or Update
    const existing = existingMap.get(matchedName);

    if (!existing) {
      logger.success(`Creating:   "${desired.name}"`);
      await manager.create(desired);
      existingMap.set(desired.name, {
        name: desired.name,
        color: cleanColor,
        description: desired.description,
      });
    } else {
      const isColorDiff = existing.color.toLowerCase() !== cleanColor;
      const isDescDiff = (existing.description || "") !== desired.description;

      if (isColorDiff || isDescDiff) {
        logger.info(`Updating:   "${desired.name}"`);
        await manager.update(existing.name, desired);
        // Update map just in case
        existingMap.set(desired.name, {
          ...existing,
          color: cleanColor,
          description: desired.description,
        });
      } else {
        logger.skip(`Up-to-date: "${desired.name}"`);
      }
    }
  }

  // 2. Process Deletions
  if (config.delete) {
    for (const name of config.delete) {
      if (existingMap.has(name)) {
        logger.error(`Deleting:   "${name}"`);
        await manager.delete(name);
        existingMap.delete(name);
      } else {
        logger.skip(`Deletion target "${name}" not found`);
      }
    }
  }

  console.log("\n✨ Done.");
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  main();
}
