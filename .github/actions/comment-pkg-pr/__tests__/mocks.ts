/**
 * Test mock setup - re-exports from __fixtures__ and provides setup helpers
 */
import { mock } from "bun:test";

// Re-export all mocks from fixtures
export {
  cleanupSummary,
  clearCoreMocks,
  debug as mockDebug,
  error as mockError,
  getInput as mockGetInput,
  info as mockInfo,
  setFailed as mockSetFailed,
  setOutput as mockSetOutput,
  summary as mockSummary,
  warning as mockWarning,
} from "fixtures/core.ts";

export {
  clearGitHubMocks,
  context as mockContext,
  getOctokit as mockGetOctokit,
  type MockOctokit,
  mockOctokit,
  setContextForPullRequest,
  setContextForPush,
  type TestIssueComment,
  type TestPullRequest,
} from "fixtures/github.ts";

import * as coreMocks from "fixtures/core.ts";
import * as githubMocks from "fixtures/github.ts";

/**
 * Setup module mocks. Must be called before importing source files.
 */
export function setupMocks(): void {
  mock.module("@actions/core", () => ({
    debug: coreMocks.debug,
    error: coreMocks.error,
    info: coreMocks.info,
    warning: coreMocks.warning,
    getInput: coreMocks.getInput,
    setOutput: coreMocks.setOutput,
    setFailed: coreMocks.setFailed,
    summary: coreMocks.summary,
  }));

  mock.module("@actions/github", () => ({
    context: githubMocks.context,
    getOctokit: githubMocks.getOctokit,
  }));
}

/**
 * Clear all mock call history and reset implementations.
 * Call this in beforeEach() to ensure test isolation.
 */
export function clearAllMocks(): void {
  coreMocks.clearCoreMocks();
  githubMocks.clearGitHubMocks();
}

/**
 * Cleanup temp files created by mocks.
 * Call this in afterAll() to clean up.
 */
export function cleanupMocks(): void {
  coreMocks.cleanupSummary();
}
