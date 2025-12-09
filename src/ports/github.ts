/**
 * GitHub client types and interfaces
 * @module
 */

import type { Octokit } from "octokit";
import type { getOctokit } from "@actions/github";
import type { components } from "@octokit/openapi-types";

// ============================================================================
// API Schema Types (from @octokit/openapi-types - auto-updated with GitHub API)
// ============================================================================

/** GitHub label schema from API response */
export type GitHubLabelSchema = components["schemas"]["label"];

// ============================================================================
// Domain Types
// ============================================================================

/** Label as returned by GitHub API (simplified) */
export interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

/** Options for GitHub label API operations */
export interface LabelOptions {
  /** The name of the label */
  name: string;
  /** The color of the label as 6 character hex code, without '#' */
  color?: string;
  /** The description of the label */
  description?: string;
  /** The new name of the label (for renames) */
  new_name?: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

/** Configuration for creating a GitHub client */
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

// ============================================================================
// Client Interface
// ============================================================================

/**
 * GitHub client interface for label CRUD operations
 *
 * Implementations:
 * - OctokitClient: Standard octokit package for CLI usage
 * - ActionsGitHubClient: @actions/github for GitHub Actions context
 */
export interface IGitHubClient {
  /** Repository owner */
  readonly owner: string;

  /** Repository name */
  readonly repo: string;

  /** Whether running in dry-run mode */
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

// ============================================================================
// Octokit Abstraction (union type for type safety across both implementations)
// ============================================================================

/** Octokit instance from @actions/github */
type ActionsOctokit = ReturnType<typeof getOctokit>;

/**
 * Union of both Octokit types - ensures type compatibility.
 * If either package's API changes, TypeScript will catch it.
 */
export type OctokitLike = Octokit | ActionsOctokit;
