/**
 * GitHub client types and interfaces
 * @module
 */

import type { getOctokit } from '@actions/github';
import type { components } from '@octokit/openapi-types';
import type { Octokit } from 'octokit';

// ============================================================================
// API Schema Types (from @octokit/openapi-types - auto-updated with GitHub API)
// ============================================================================

/** GitHub label schema from API response */
export type GitHubLabelSchema = components['schemas']['label'];

// ============================================================================
// Domain Types
// ============================================================================

/** Label as returned by GitHub API (simplified) */
export interface GitHubLabel {
	color: string;
	description: string | null;
	name: string;
}

/** Options for GitHub label API operations */
export interface LabelOptions {
	/** The color of the label as 6 character hex code, without '#' */
	color?: string;
	/** The description of the label */
	description?: string;
	/** The name of the label */
	name: string;
	/** The new name of the label (for renames) */
	new_name?: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

/** Configuration for creating a GitHub client */
export interface GitHubClientConfig {
	/** Whether to skip write operations */
	dryRun: boolean;
	/** Repository owner */
	owner: string;
	/** Repository name */
	repo: string;
	/** GitHub API token */
	token: string;
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
	/**
	 * Create a new label
	 * @returns Created label, or null if dry-run
	 * @throws Error on API failure
	 */
	create(options: LabelOptions): Promise<GitHubLabel | null>;

	/**
	 * Delete a label
	 * @throws Error on API failure
	 */
	delete(name: string): Promise<void>;

	/**
	 * Get a single label by name
	 * @returns Label if found, null if not found
	 * @throws Error on API failure (except 404)
	 */
	get(name: string): Promise<GitHubLabel | null>;

	/** Whether running in dry-run mode */
	readonly isDryRun: boolean;

	/**
	 * List all labels in the repository
	 * Uses pagination to fetch all labels
	 * @throws Error on API failure
	 */
	list(): Promise<GitHubLabel[]>;
	/** Repository owner */
	readonly owner: string;

	/** Repository name */
	readonly repo: string;

	/**
	 * Update an existing label
	 * @param currentName Current name of the label
	 * @param options New label properties
	 * @returns Updated label, or null if dry-run
	 * @throws Error on API failure
	 */
	update(currentName: string, options: LabelOptions): Promise<GitHubLabel | null>;
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
