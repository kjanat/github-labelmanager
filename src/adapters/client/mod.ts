/**
 * GitHub client adapters for different environments
 * @module
 */

// Types (re-exported from ports for convenience)
export type {
	GitHubClientConfig,
	GitHubLabel,
	GitHubLabelSchema,
	IGitHubClient,
	LabelOptions,
	OctokitLike,
} from '#src/ports/github.ts';
// Implementations
export { ActionsGitHubClient } from './actions.ts';
// Base class (for extension)
export { BaseGitHubClient } from './base.ts';
export { OctokitClient } from './octokit.ts';
