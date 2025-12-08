/**
 * Octokit-based GitHub client for CLI usage
 * Uses the canonical octokit package with built-in throttling and retry
 * @module
 */

import { Octokit } from "octokit";
import type { components } from "@octokit/openapi-types";
import type { ILogger } from "@/adapters/logger/mod.ts";
import type { GitHubClientConfig, GitHubLabel } from "./types.ts";
import { BaseGitHubClient } from "./base.ts";

/** GitHub label schema from API response */
type GitHubLabelSchema = components["schemas"]["label"];

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
    const labels = await this.octokit.paginate(
      "GET /repos/{owner}/{repo}/labels",
      {
        owner: this.owner,
        repo: this.repo,
        per_page: 100,
      },
    );

    return labels.map((l: GitHubLabelSchema) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    }));
  }
}
