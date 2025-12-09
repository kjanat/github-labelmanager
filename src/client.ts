/**
 * GitHub API client for label operations
 * This module provides a unified interface using environment-appropriate implementations
 * @module
 */

import type { EnvConfig } from "./types.ts";
import type {
  GitHubLabel,
  IGitHubClient,
  LabelOptions,
} from "./adapters/client/mod.ts";
import type { ILogger } from "./adapters/logger/mod.ts";
import { createGitHubClient, createLogger } from "./factory.ts";

/**
 * GitHub label manager client
 *
 * Automatically selects the appropriate implementation based on environment:
 * - GitHub Actions: Uses @actions/github with native proxy support
 * - Local CLI: Uses octokit with throttling and retry
 */
export class LabelManager {
  private client: IGitHubClient;
  private logger: ILogger;

  /**
   * Create a new LabelManager
   *
   * @param env - Environment configuration
   * @param options - Optional client and logger for testing/DI
   */
  constructor(
    env: EnvConfig,
    options: { client?: IGitHubClient; logger?: ILogger } = {},
  ) {
    this.logger = options.logger ?? createLogger();
    this.client = options.client ?? createGitHubClient(
      {
        token: env.token,
        owner: env.owner,
        repo: env.repo,
        dryRun: env.dryRun,
      },
      this.logger,
    );
  }

  /** Get repository info */
  get repoInfo(): { owner: string; repo: string } {
    return { owner: this.client.owner, repo: this.client.repo };
  }

  /** Check if running in dry-run mode */
  get isDryRun(): boolean {
    return this.client.isDryRun;
  }

  /** Get the underlying logger */
  getLogger(): ILogger {
    return this.logger;
  }

  /**
   * List all labels in the repository using built-in pagination
   * @throws Error on API failure
   */
  list(): Promise<GitHubLabel[]> {
    return this.client.list();
  }

  /**
   * Get a single label by name
   */
  get(name: string): Promise<GitHubLabel | null> {
    return this.client.get(name);
  }

  /**
   * Create a new label
   */
  create(options: LabelOptions): Promise<GitHubLabel | null> {
    return this.client.create(options);
  }

  /**
   * Update an existing label
   */
  update(
    currentName: string,
    options: LabelOptions,
  ): Promise<GitHubLabel | null> {
    return this.client.update(currentName, options);
  }

  /**
   * Delete a label
   */
  delete(name: string): Promise<void> {
    return this.client.delete(name);
  }

  /**
   * Format error for logging
   */
  static formatError(error: unknown): string {
    if (error && typeof error === "object") {
      const e = error as Record<string, unknown>;
      const status = e.status ?? "unknown";
      const message = e.message ?? JSON.stringify(error);
      return `${status} - ${message}`;
    }
    return String(error);
  }
}
