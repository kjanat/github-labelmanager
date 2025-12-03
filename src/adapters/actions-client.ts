/**
 * GitHub Actions client using @actions/github
 * Pre-configured for GitHub Actions environment with proper proxy support
 * @module
 */

import * as github from "@actions/github";
import type { components } from "@octokit/openapi-types";
import type {
  GitHubClientConfig,
  IGitHubClient,
} from "@/interfaces/github-client.ts";
import type { GitHubLabel, LabelOptions } from "@/types.ts";
import type { ILogger } from "@/interfaces/logger.ts";

// Type for GitHub label from API response
type GitHubLabelSchema = components["schemas"]["label"];

// Type for the octokit instance from @actions/github
type ActionsOctokit = ReturnType<typeof github.getOctokit>;

/**
 * GitHub Actions client using @actions/github
 *
 * Features:
 * - Pre-authenticated via GITHUB_TOKEN
 * - Proper proxy support for self-hosted runners
 * - Correct base URL handling for GHES
 * - Native pagination via octokit.paginate()
 *
 * Note: Does not include throttling - GitHub Actions has shorter runs
 * and rate limiting is less of a concern
 */
export class ActionsGitHubClient implements IGitHubClient {
  private octokit: ActionsOctokit;
  private logger: ILogger;

  readonly owner: string;
  readonly repo: string;
  readonly isDryRun: boolean;

  constructor(config: GitHubClientConfig, logger: ILogger) {
    this.logger = logger;
    this.owner = config.owner;
    this.repo = config.repo;
    this.isDryRun = config.dryRun;

    // @actions/github handles authentication and proxy configuration
    this.octokit = github.getOctokit(config.token);
  }

  async list(): Promise<GitHubLabel[]> {
    const labels = await this.octokit.paginate(
      this.octokit.rest.issues.listLabelsForRepo,
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
