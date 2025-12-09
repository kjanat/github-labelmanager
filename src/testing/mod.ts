/**
 * Test utilities for github-labelmanager
 *
 * Provides mock implementations for testing without hitting the GitHub API.
 *
 * @example
 * ```ts
 * import { MockGitHubClient, NullLogger, createTestEnv } from "@kjanat/github-labelmanager";
 * import { LabelManager } from "@kjanat/github-labelmanager";
 *
 * const client = new MockGitHubClient({ labels: [{ name: "bug", color: "d73a4a", description: "Bug" }] });
 * const logger = new NullLogger();
 * const manager = new LabelManager(createTestEnv(), { client, logger });
 * ```
 *
 * @module
 */

// Mocks
export {
  type ApiCall,
  MockGitHubClient,
  type MockGitHubClientOptions,
  MockLogger,
} from "./mocks.ts";

// Stubs
export {
  ExitStubError,
  NullLogger,
  stubArgs,
  stubEnv,
  stubExit,
} from "./stubs.ts";

// Fixtures
export {
  captureConsole,
  type CapturedConsole,
  type CoreCall,
  createEnvGet,
  createMockActionsCore,
  createMockOctokit,
  createTestEnv,
  type FetchCall,
  mockFetch,
  type MockFetchResponse,
  type MockOctokitOptions,
  type MockSummary,
  type OctokitRequest,
} from "./fixtures.ts";
