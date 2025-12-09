/**
 * Factory functions for creating environment-appropriate implementations
 * @module
 */

import type { ILogger } from "./adapters/logger/mod.ts";
import type {
  GitHubClientConfig,
  IGitHubClient,
} from "./adapters/client/mod.ts";
import { ActionsLogger, ConsoleLogger } from "./adapters/logger/mod.ts";
import { ActionsGitHubClient, OctokitClient } from "./adapters/client/mod.ts";

/**
 * Check if running in GitHub Actions environment
 */
export function isGitHubActions(): boolean {
  return Deno.env.get("GITHUB_ACTIONS") === "true";
}

/**
 * Create appropriate logger for current environment
 *
 * - GitHub Actions: Uses @actions/core for native annotations and groups
 * - Local CLI: Uses colored console output
 */
export function createLogger(): ILogger {
  if (isGitHubActions()) {
    return new ActionsLogger();
  }
  return new ConsoleLogger();
}

/**
 * Create appropriate GitHub client for current environment
 *
 * - GitHub Actions: Uses @actions/github with proxy support
 * - Local CLI: Uses octokit with throttling and retry
 */
export function createGitHubClient(
  config: GitHubClientConfig,
  logger: ILogger,
): IGitHubClient {
  if (isGitHubActions()) {
    return new ActionsGitHubClient(config, logger);
  }
  return new OctokitClient(config, logger);
}

/**
 * Create both logger and client for current environment
 */
export function createServices(config: GitHubClientConfig): {
  logger: ILogger;
  client: IGitHubClient;
} {
  const logger = createLogger();
  const client = createGitHubClient(config, logger);
  return { logger, client };
}

// Re-export types
export type { ILogger } from "./adapters/logger/mod.ts";
export type {
  GitHubClientConfig,
  IGitHubClient,
} from "./adapters/client/mod.ts";
