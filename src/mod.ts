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
} from "@/types.ts";

// Interfaces
export type { AnnotationProperties, ILogger } from "@/interfaces/logger.ts";
export type {
  GitHubClientConfig,
  IGitHubClient,
} from "@/interfaces/github-client.ts";

// Config
export {
  ConfigError,
  getEnv,
  isLabelConfig,
  loadConfig,
  printHelp,
} from "@/config.ts";

// Client (high-level API with auto-detection)
export { LabelManager } from "@/client.ts";

// Factory (for manual control over implementations)
export {
  createGitHubClient,
  createLogger,
  createServices,
  isGitHubActions,
} from "@/factory.ts";

// Adapters (for direct instantiation)
export {
  ConsoleLogger,
  ExtendedConsoleLogger,
} from "@/adapters/console-logger.ts";
export { ActionsLogger } from "@/adapters/actions-logger.ts";
export { OctokitClient } from "@/adapters/octokit-client.ts";
export { ActionsGitHubClient } from "@/adapters/actions-client.ts";

// Sync
export { syncLabels } from "@/sync.ts";

// Legacy logger exports (for backwards compatibility)
export { COLORS, LOG_LEVELS, logger } from "@/logger.ts";
export type { Logger, LogLevel } from "@/logger.ts";
