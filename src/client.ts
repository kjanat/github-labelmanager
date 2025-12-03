/**
 * GitHub API client for label operations
 * @module
 */

import { Octokit } from "@octokit/core";
import type { EnvConfig, GitHubLabel, LabelOptions } from "./types.ts";
import { logger } from "./logger.ts";

/** Retry options for API calls */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Retry wrapper with exponential backoff for rate limiting
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err &&
        typeof err === "object" &&
        "status" in err &&
        (err.status === 429 || err.status === 503);

      if (!isRetryable || attempt === maxRetries - 1) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn(`Rate limited, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Unreachable");
}

/**
 * GitHub label manager client
 */
export class LabelManager {
  private octokit: Octokit;
  private env: EnvConfig;

  constructor(env: EnvConfig) {
    this.env = env;
    this.octokit = new Octokit({
      auth: env.token,
      request: {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
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
   * List all labels in the repository
   * @throws Error on API failure (does not swallow errors)
   */
  async list(page = 1): Promise<GitHubLabel[]> {
    const { data } = await withRetry(() =>
      this.octokit.request("GET /repos/{owner}/{repo}/labels", {
        owner: this.env.owner,
        repo: this.env.repo,
        per_page: 100,
        page,
      })
    );

    const pageLabels = data.map((l) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    }));

    // Paginate if there might be more results
    if (pageLabels.length >= 100) {
      const nextPage = await this.list(page + 1);
      return [...pageLabels, ...nextPage];
    }

    return pageLabels;
  }

  /**
   * Get a single label by name
   */
  async get(name: string): Promise<GitHubLabel | null> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.request("GET /repos/{owner}/{repo}/labels/{name}", {
          owner: this.env.owner,
          repo: this.env.repo,
          name,
        })
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

    const { data } = await withRetry(() =>
      this.octokit.request("POST /repos/{owner}/{repo}/labels", {
        owner: this.env.owner,
        repo: this.env.repo,
        name: options.name,
        color: options.color
          ? String(options.color).replace(/^#/, "")
          : undefined,
        description: options.description,
      })
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

    const { data } = await withRetry(() =>
      this.octokit.request("PATCH /repos/{owner}/{repo}/labels/{name}", {
        owner: this.env.owner,
        repo: this.env.repo,
        name: currentName,
        new_name: options.new_name,
        color: options.color
          ? String(options.color).replace(/^#/, "")
          : undefined,
        description: options.description,
      })
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

    await withRetry(() =>
      this.octokit.request("DELETE /repos/{owner}/{repo}/labels/{name}", {
        owner: this.env.owner,
        repo: this.env.repo,
        name,
      })
    );
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
