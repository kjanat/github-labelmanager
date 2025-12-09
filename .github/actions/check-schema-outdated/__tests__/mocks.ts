/**
 * Test mock setup - re-exports from __fixtures__ and provides setup helpers
 */
import { mock } from "bun:test";

// Re-export all mocks from fixtures
export {
  cleanupSummary,
  clearCoreMocks,
  debug as mockDebug,
  endGroup as mockEndGroup,
  error as mockError,
  getInput as mockGetInput,
  info as mockInfo,
  setFailed as mockSetFailed,
  setOutput as mockSetOutput,
  setWebSource,
  startGroup as mockStartGroup,
  summary as mockSummary,
  toPlatformPath as mockToPlatformPath,
  warning as mockWarning,
} from "fixtures/core.ts";

export {
  clearExecMocks,
  getExecOutput as mockGetExecOutput,
} from "fixtures/exec.ts";

export { clearGitHubMocks, context as mockContext } from "fixtures/github.ts";

import * as coreMocks from "fixtures/core.ts";
import * as execMocks from "fixtures/exec.ts";
import * as githubMocks from "fixtures/github.ts";

/**
 * Setup module mocks. Must be called before importing source files.
 */
export function setupMocks(): void {
  mock.module("@actions/core", () => ({
    debug: coreMocks.debug,
    error: coreMocks.error,
    info: coreMocks.info,
    getInput: coreMocks.getInput,
    setOutput: coreMocks.setOutput,
    setFailed: coreMocks.setFailed,
    warning: coreMocks.warning,
    startGroup: coreMocks.startGroup,
    endGroup: coreMocks.endGroup,
    toPlatformPath: coreMocks.toPlatformPath,
    summary: coreMocks.summary,
  }));

  mock.module("@actions/exec", () => ({
    getExecOutput: execMocks.getExecOutput,
  }));

  mock.module("@actions/github", () => ({ context: githubMocks.context }));
}

/**
 * Clear all mock call history and reset implementations.
 * Call this in beforeEach() to ensure test isolation.
 */
export function clearAllMocks(): void {
  coreMocks.clearCoreMocks();
  execMocks.clearExecMocks();
  githubMocks.clearGitHubMocks();
}

/**
 * Cleanup temp files created by mocks.
 * Call this in afterAll() to clean up.
 */
export function cleanupMocks(): void {
  coreMocks.cleanupSummary();
}
