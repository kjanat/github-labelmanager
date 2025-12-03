/**
 * GitHub Label Manager
 *
 * Sync GitHub repository labels from a YAML configuration file.
 *
 * @example
 * ```ts
 * import { LabelManager, loadConfig, syncLabels } from "@kjanat/github-labelmanager";
 *
 * const token = Deno.env.get("GITHUB_TOKEN");
 * if (!token) {
 *   throw new Error("GITHUB_TOKEN required");
 * }
 *
 * const config = await loadConfig(".github/labels.yml");
 * const manager = new LabelManager({
 *   token,
 *   owner: "owner",
 *   repo: "repo",
 *   dryRun: false,
 * });
 *
 * const result = await syncLabels(manager, config);
 * console.log(result.summary);
 * ```
 *
 * @module
 */

// Types
export type {
  EnvConfig,
  GitHubLabel,
  LabelConfig,
  LabelDefinition,
  LabelOptions,
  SyncOperation,
  SyncResult,
} from "./types.ts";

// Config
export {
  ConfigError,
  getEnv,
  isLabelConfig,
  loadConfig,
  printHelp,
} from "./config.ts";

// Client
export { LabelManager } from "./client.ts";

// Sync
export { syncLabels } from "./sync.ts";

// Logger (exposed for library users who want consistent logging)
export { COLORS, createLogger, LOG_LEVELS, logger } from "./logger.ts";
export type { Logger, LogLevel } from "./logger.ts";
