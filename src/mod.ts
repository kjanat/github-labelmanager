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
  LabelConfig,
  LabelDefinition,
  SyncOperation,
  SyncResult,
} from "./types.ts";

// Client types
export type {
  GitHubClientConfig,
  GitHubLabel,
  IGitHubClient,
  LabelOptions,
} from "./adapters/client/mod.ts";

// Logger types
export type { AnnotationProperties, ILogger } from "./adapters/logger/mod.ts";

// Config
export {
  ConfigError,
  getEnv,
  isLabelConfig,
  loadConfig,
  printHelp,
} from "./config.ts";

// Client (high-level API with auto-detection)
export { LabelManager } from "./client.ts";

// Factory (for manual control over implementations)
export {
  createGitHubClient,
  createLogger,
  createServices,
  isGitHubActions,
} from "./factory.ts";

// Adapters (for direct instantiation)
export { ActionsLogger, ConsoleLogger } from "./adapters/logger/mod.ts";
export { ActionsGitHubClient, OctokitClient } from "./adapters/client/mod.ts";

// Sync
export { syncLabels } from "./sync.ts";

// Test utilities (for consumers writing tests)
export { createTestEnv, MockGitHubClient, NullLogger } from "./testing.ts";
export type { ApiCall, MockGitHubClientOptions } from "./testing.ts";
