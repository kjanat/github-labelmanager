/**
 * @actions/github mock for bun:test
 */
import type { context as realContext } from "@actions/github";

type ContextType = typeof realContext;

// Mutable version of the context properties we need
type MutableContext = {
  -readonly [K in "sha" | "serverUrl" | "repo"]: ContextType[K];
};

// Default values
const defaults = {
  sha: "abc123def456",
  serverUrl: "https://github.com",
  repo: { owner: "test-owner", repo: "test-repo" },
};

// Mock context - only the properties we use
export const context: MutableContext = {
  sha: defaults.sha,
  serverUrl: defaults.serverUrl,
  repo: { ...defaults.repo },
};

/** Clear/reset github mocks */
export function clearGitHubMocks(): void {
  context.sha = defaults.sha;
  context.serverUrl = defaults.serverUrl;
  context.repo = { ...defaults.repo };
}
