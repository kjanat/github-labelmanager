/**
 * Base GitHub client with shared CRUD logic
 * @module
 */

import type { ILogger } from "~/adapters/logger/mod.ts";
import type {
  GitHubClientConfig,
  GitHubLabel,
  IGitHubClient,
  LabelOptions,
  OctokitLike,
} from "./types.ts";

/**
 * Abstract base class for GitHub clients
 *
 * Provides shared CRUD implementations for label operations.
 * Subclasses must:
 * 1. Initialize the octokit instance with appropriate config (auth, proxy, throttling)
 * 2. Implement list() as paginate() signatures differ between octokit versions
 */
export abstract class BaseGitHubClient implements IGitHubClient {
  /** Octokit instance - must be initialized by subclass */
  protected abstract readonly octokit: OctokitLike;

  protected readonly logger: ILogger;

  readonly owner: string;
  readonly repo: string;
  readonly isDryRun: boolean;

  constructor(config: GitHubClientConfig, logger: ILogger) {
    this.logger = logger;
    this.owner = config.owner;
    this.repo = config.repo;
    this.isDryRun = config.dryRun;
  }

  /**
   * List all labels - must be implemented by subclass
   * (paginate() signatures differ between octokit versions)
   */
  abstract list(): Promise<GitHubLabel[]>;

  async get(name: string): Promise<GitHubLabel | null> {
    try {
      const { data } = await this.octokit.rest.issues.getLabel({
        owner: this.owner,
        repo: this.repo,
        name,
      });
      return this.mapLabelResponse(data);
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

    return this.mapLabelResponse(data);
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

    return this.mapLabelResponse(data);
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
  protected isNotFoundError(err: unknown): boolean {
    return (
      err !== null &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 404
    );
  }

  /**
   * Map Octokit label response to GitHubLabel
   */
  protected mapLabelResponse(
    data: { name: string; color: string; description: string | null },
  ): GitHubLabel {
    return {
      name: data.name,
      color: data.color,
      description: data.description,
    };
  }
}
