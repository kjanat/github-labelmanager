import type { GitHub } from "@actions/github/lib/utils.js";

/** Octokit instance type from @actions/github */
export type Octokit = InstanceType<typeof GitHub>;

/** Package metadata from pkg-pr-new output */
export interface PackageInfo {
  name: string;
  url: string;
  shasum: string;
}

/** Template metadata from pkg-pr-new output */
export interface TemplateInfo {
  name: string;
  url: string;
}

/**
 * Metadata about the published packages and templates
 * @see https://github.com/stackblitz-labs/pkg.pr.new
 */
export interface OutputMetadata {
  packages: PackageInfo[];
  templates: TemplateInfo[];
}

/** Action inputs */
export interface ActionInputs {
  githubToken: string;
  outputFile: string;
  commentIdentifier: string;
}

/** Result from comment operations */
export interface CommentResult {
  commentId: number;
  commentUrl: string;
}

/** Result from the action run */
export interface RunResult {
  prFound: boolean;
  commentId?: number;
  commentUrl?: string;
}
