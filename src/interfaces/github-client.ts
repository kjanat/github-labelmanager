/**
 * GitHub client interface for label operations
 * @module
 */

import type { GitHubLabel, LabelOptions } from "../types.ts";

/**
 * GitHub client interface for label CRUD operations
 *
 * Implementations:
 * - OctokitClient: Standard octokit package for CLI usage
 * - ActionsGitHubClient: @actions/github for GitHub Actions context
 */
export interface IGitHubClient {
  /**
   * Repository owner
   */
  readonly owner: string;

  /**
   * Repository name
   */
  readonly repo: string;

  /**
   * Whether running in dry-run mode
   */
  readonly isDryRun: boolean;

  /**
   * List all labels in the repository
   * Uses pagination to fetch all labels
   * @throws Error on API failure
   */
  list(): Promise<GitHubLabel[]>;

  /**
   * Get a single label by name
   * @returns Label if found, null if not found
   * @throws Error on API failure (except 404)
   */
  get(name: string): Promise<GitHubLabel | null>;

  /**
   * Create a new label
   * @returns Created label, or null if dry-run
   * @throws Error on API failure
   */
  create(options: LabelOptions): Promise<GitHubLabel | null>;

  /**
   * Update an existing label
   * @param currentName Current name of the label
   * @param options New label properties
   * @returns Updated label, or null if dry-run
   * @throws Error on API failure
   */
  update(
    currentName: string,
    options: LabelOptions,
  ): Promise<GitHubLabel | null>;

  /**
   * Delete a label
   * @throws Error on API failure
   */
  delete(name: string): Promise<void>;
}

/**
 * Configuration for creating a GitHub client
 */
export interface GitHubClientConfig {
  /** GitHub API token */
  token: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Whether to skip write operations */
  dryRun: boolean;
}
