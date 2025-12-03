/**
 * GitHub API client for label operations
 * @module
 */

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { createActionAuth } from "@octokit/auth-action";
import type { EndpointDefaults } from "@octokit/types";
import type { components } from "@octokit/openapi-types";
import type { EnvConfig, GitHubLabel, LabelOptions } from "./types.ts";
import { logger } from "./logger.ts";

// Create throttled Octokit class
const ThrottledOctokit = Octokit.plugin(throttling);

// Type for throttle handler options
type ThrottleHandlerOptions = Required<EndpointDefaults>;

// Type for GitHub label from API response
type GitHubLabelSchema = components["schemas"]["label"];

/**
 * Correct type for rate limit handlers.
 * Note: The official LimitHandler type returns `void` but the implementation
 * actually uses the boolean return value to determine retry behavior.
 * See: https://github.com/octokit/plugin-throttling.js#readme
 */
type RateLimitHandler = (
  retryAfter: number,
  options: ThrottleHandlerOptions,
  octokit: unknown,
  retryCount: number,
) => boolean | void;

/**
 * GitHub label manager client
 *
 * Uses @octokit/rest with:
 * - Built-in pagination via `octokit.paginate()`
 * - Automatic rate limit handling via @octokit/plugin-throttling
 * - GitHub Actions auth via @octokit/auth-action when in Actions context
 */
export class LabelManager {
  private octokit: InstanceType<typeof ThrottledOctokit>;
  private env: EnvConfig;

  constructor(env: EnvConfig) {
    this.env = env;

    // Detect if running in GitHub Actions
    const isGitHubAction = Deno.env.get("GITHUB_ACTIONS") === "true";

    this.octokit = new ThrottledOctokit({
      // When in GitHub Actions, let createActionAuth handle auth from GITHUB_TOKEN env
      // Otherwise use the token passed in config
      auth: isGitHubAction ? undefined : env.token,
      authStrategy: isGitHubAction ? createActionAuth : undefined,
      request: {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      throttle: {
        onRateLimit: ((
          retryAfter: number,
          options: ThrottleHandlerOptions,
          _octokit: unknown,
          retryCount: number,
        ) => {
          logger.warn(
            `Rate limit hit for ${options.method} ${options.url}`,
          );
          // Retry twice after hitting rate limit
          if (retryCount < 2) {
            logger.info(`Retrying after ${retryAfter} seconds...`);
            return true;
          }
          logger.error("Rate limit retries exhausted");
          return false;
        }) as RateLimitHandler,
        onSecondaryRateLimit: ((
          retryAfter: number,
          options: ThrottleHandlerOptions,
          _octokit: unknown,
          retryCount: number,
        ) => {
          logger.warn(
            `Secondary rate limit hit for ${options.method} ${options.url}, ` +
              `retry after ${retryAfter}s`,
          );
          // Allow 1 retry on secondary rate limits (abuse detection)
          if (retryCount < 1) {
            logger.info(`Retrying after ${retryAfter} seconds...`);
            return true;
          }
          logger.error("Secondary rate limit retry exhausted");
          return false;
        }) as RateLimitHandler,
      },
    });
  }

  /** Get repository info */
  get repoInfo(): { owner: string; repo: string } {
    return { owner: this.env.owner, repo: this.env.repo };
  }

  /** Check if running in dry-run mode */
  get isDryRun(): boolean {
    return this.env.dryRun;
  }

  /**
   * List all labels in the repository using built-in pagination
   * @throws Error on API failure
   */
  async list(): Promise<GitHubLabel[]> {
    const labels = await this.octokit.paginate(
      "GET /repos/{owner}/{repo}/labels",
      {
        owner: this.env.owner,
        repo: this.env.repo,
        per_page: 100,
      },
    );

    return labels.map((l: GitHubLabelSchema) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    }));
  }

  /**
   * Get a single label by name
   */
  async get(name: string): Promise<GitHubLabel | null> {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/labels/{name}",
        {
          owner: this.env.owner,
          repo: this.env.repo,
          name,
        },
      );
      return {
        name: data.name,
        color: data.color,
        description: data.description,
      };
    } catch (err) {
      if (this.isNotFoundError(err)) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Create a new label
   */
  async create(options: LabelOptions): Promise<GitHubLabel | null> {
    if (this.env.dryRun) {
      return null;
    }

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

    return {
      name: data.name,
      color: data.color,
      description: data.description,
    };
  }

  /**
   * Update an existing label
   */
  async update(
    currentName: string,
    options: LabelOptions,
  ): Promise<GitHubLabel | null> {
    if (this.env.dryRun) {
      return null;
    }

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

    return {
      name: data.name,
      color: data.color,
      description: data.description,
    };
  }

  /**
   * Delete a label
   */
  async delete(name: string): Promise<void> {
    if (this.env.dryRun) {
      return;
    }

    await this.octokit.request("DELETE /repos/{owner}/{repo}/labels/{name}", {
      owner: this.env.owner,
      repo: this.env.repo,
      name,
    });
  }

  /**
   * Check if error is a 404 Not Found
   */
  private isNotFoundError(err: unknown): boolean {
    return (
      err !== null &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 404
    );
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
