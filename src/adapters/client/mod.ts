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
} from "~/ports/github.ts";

// Base class (for extension)
export { BaseGitHubClient } from "./base.ts";

// Implementations
export { ActionsGitHubClient } from "./actions.ts";
export { OctokitClient } from "./octokit.ts";
