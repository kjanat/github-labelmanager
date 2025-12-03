/**
 * Octokit-based GitHub client for CLI usage
 * Uses the canonical octokit package with built-in throttling and retry
 * @module
 */

import { Octokit } from "octokit";
import type { components } from "@octokit/openapi-types";
import type {
  GitHubClientConfig,
  IGitHubClient,
} from "../interfaces/github-client.ts";
import type { GitHubLabel, LabelOptions } from "../types.ts";
import type { ILogger } from "../interfaces/logger.ts";

/**
 * Throttle handler options from octokit
 * Using Record type since the exact type is complex and internal
 */
interface ThrottleOptions {
  method: string;
  url: string;
  request: { retryCount: number };
}

// Type for GitHub label from API response
type GitHubLabelSchema = components["schemas"]["label"];

/**
 * Octokit-based GitHub client for CLI usage
 *
 * Features:
 * - Built-in rate limit handling via @octokit/plugin-throttling
 * - Built-in retry logic via @octokit/plugin-retry
 * - Automatic pagination via octokit.paginate()
 * - Canonical pattern from GitHub's official documentation
 */
export class OctokitClient implements IGitHubClient {
  private octokit: Octokit;
  private logger: ILogger;

  readonly owner: string;
  readonly repo: string;
  readonly isDryRun: boolean;

  constructor(config: GitHubClientConfig, logger: ILogger) {
    this.logger = logger;
    this.owner = config.owner;
    this.repo = config.repo;
    this.isDryRun = config.dryRun;

    this.octokit = new Octokit({
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

  async get(name: string): Promise<GitHubLabel | null> {
    try {
      const { data } = await this.octokit.rest.issues.getLabel({
        owner: this.owner,
        repo: this.repo,
        name,
      });
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

  async create(options: LabelOptions): Promise<GitHubLabel | null> {
    if (this.isDryRun) {
      this.logger.info(`[dry-run] Would create label: ${options.name}`);
      return null;
    }

    const { data } = await this.octokit.rest.issues.createLabel({
      owner: this.owner,
      repo: this.repo,
      name: options.name,
      color: options.color?.replace(/^#/, ""),
      description: options.description,
    });

    return {
      name: data.name,
      color: data.color,
      description: data.description,
    };
  }

  async update(
    currentName: string,
    options: LabelOptions,
  ): Promise<GitHubLabel | null> {
    if (this.isDryRun) {
      const action = options.new_name
        ? `rename to ${options.new_name}`
        : "update";
      this.logger.info(`[dry-run] Would ${action} label: ${currentName}`);
      return null;
    }

    const { data } = await this.octokit.rest.issues.updateLabel({
      owner: this.owner,
      repo: this.repo,
      name: currentName,
      new_name: options.new_name,
      color: options.color?.replace(/^#/, ""),
      description: options.description,
    });

    return {
      name: data.name,
      color: data.color,
      description: data.description,
    };
  }

  async delete(name: string): Promise<void> {
    if (this.isDryRun) {
      this.logger.info(`[dry-run] Would delete label: ${name}`);
      return;
    }

    await this.octokit.rest.issues.deleteLabel({
      owner: this.owner,
      repo: this.repo,
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
}
