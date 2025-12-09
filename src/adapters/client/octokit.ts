/**
 * Octokit-based GitHub client for CLI usage
 * Uses the canonical octokit package with built-in throttling and retry
 * @module
 */

import { Octokit } from "octokit";
import type { ILogger } from "~/adapters/logger/mod.ts";
import type {
  GitHubClientConfig,
  GitHubLabel,
  GitHubLabelSchema,
} from "~/ports/github.ts";
import { BaseGitHubClient } from "./base.ts";

/**
 * Throttle handler options from octokit
 */
interface ThrottleOptions {
  method: string;
  url: string;
  request: { retryCount: number };
}

/**
 * Octokit-based GitHub client for CLI usage
 *
 * Features:
 * - Built-in rate limit handling via @octokit/plugin-throttling
 * - Built-in retry logic via @octokit/plugin-retry
 * - Automatic pagination via octokit.paginate()
 * - Canonical pattern from GitHub's official documentation
 */
export class OctokitClient extends BaseGitHubClient {
  protected readonly octokit: Octokit;

  /**
   * @param config - Client configuration
   * @param logger - Logger instance
   * @param octokit - Optional Octokit instance for testing (avoids throttle interval leaks)
   */
  constructor(config: GitHubClientConfig, logger: ILogger, octokit?: Octokit) {
    super(config, logger);

    this.octokit = octokit ?? new Octokit({
      auth: config.token,
      throttle: {
        onRateLimit: (
          retryAfter: number,
          options: ThrottleOptions,
          _octokit: Octokit,
        ) => {
          this.logger.warn(
            `Rate limit hit for ${options.method} ${options.url}`,
          );
          // Retry once after hitting rate limit
          if (options.request.retryCount === 0) {
            this.logger.info(`Retrying after ${retryAfter} seconds...`);
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (
          retryAfter: number,
          options: ThrottleOptions,
          _octokit: Octokit,
        ) => {
          this.logger.warn(
            `Secondary rate limit hit for ${options.method} ${options.url}`,
          );
          // Retry once on secondary rate limits
          if (options.request.retryCount === 0) {
            this.logger.info(`Retrying after ${retryAfter} seconds...`);
            return true;
          }
          return false;
        },
      },
    });
  }

  async list(): Promise<GitHubLabel[]> {
    try {
      const labels = await this.octokit.paginate(
        "GET /repos/{owner}/{repo}/labels",
        {
          owner: this.owner,
          repo: this.repo,
          per_page: 100,
        },
      );

      return labels.map((l: GitHubLabelSchema) => this.mapLabelResponse(l));
    } catch (error) {
      // Type guard for Octokit errors (has numeric status property)
      if (
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        typeof (error as { status: unknown }).status === "number"
      ) {
        const octokitError = error as { status: number; message?: string };
        throw new Error(
          `Failed to list labels for ${this.owner}/${this.repo}: ` +
            `HTTP ${octokitError.status}${
              octokitError.message ? ` - ${octokitError.message}` : ""
            }`,
        );
      }
      // Wrap non-Octokit errors with context
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to list labels for ${this.owner}/${this.repo}: ${message}`,
      );
    }
  }
}
