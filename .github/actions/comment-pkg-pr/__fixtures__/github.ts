/**
 * Type-safe @actions/github mock for bun:test
 * Uses actual GitHub API types from @octokit/openapi-types
 */
import { type Mock, mock } from "bun:test";
import type { getOctokit as getOctokitType } from "@actions/github";
import type { components } from "@octokit/openapi-types";

// ============================================================================
// GitHub API Types (from @octokit/openapi-types)
// ============================================================================

/** Issue comment from GitHub API - uses official schema */
export type IssueComment = components["schemas"]["issue-comment"];

/** Pull request from GitHub API - minimal type for list response */
export type PullRequestSimple = components["schemas"]["pull-request-simple"];

// ============================================================================
// Context Types
// ============================================================================

/** Mutable context for test manipulation */
interface MutableContext {
  eventName: string;
  payload: Record<string, unknown>;
  repo: { owner: string; repo: string };
  ref: string;
  issue: { number: number };
}

// Default context values
const contextDefaults: MutableContext = {
  eventName: "pull_request",
  payload: {},
  repo: { owner: "test-owner", repo: "test-repo" },
  ref: "refs/heads/main",
  issue: { number: 1 },
};

/** Mock GitHub context */
export const context: MutableContext = { ...contextDefaults };

// ============================================================================
// Octokit Response Types
// ============================================================================

/** Minimal issue comment for testing (subset of IssueComment) */
export interface TestIssueComment {
  id: number;
  body?: string;
  html_url: string;
}

/** Minimal pull request for testing (subset of PullRequestSimple) */
export interface TestPullRequest {
  number: number;
}

/** Type for listComments API response */
type ListCommentsResponse = Promise<{ data: TestIssueComment[] }>;

/** Type for createComment API response */
type CreateCommentResponse = Promise<{ data: TestIssueComment }>;

/** Type for updateComment API response */
type UpdateCommentResponse = Promise<{ data: TestIssueComment }>;

/** Type for list pulls API response */
type ListPullsResponse = Promise<{ data: TestPullRequest[] }>;

// ============================================================================
// Mock Octokit Interfaces
// ============================================================================

/** Mock Octokit rest.issues interface */
export interface MockOctokitIssues {
  listComments: Mock<
    (params: {
      owner: string;
      repo: string;
      issue_number: number;
    }) => ListCommentsResponse
  >;
  createComment: Mock<
    (params: {
      owner: string;
      repo: string;
      issue_number: number;
      body: string;
    }) => CreateCommentResponse
  >;
  updateComment: Mock<
    (params: {
      owner: string;
      repo: string;
      comment_id: number;
      body: string;
    }) => UpdateCommentResponse
  >;
}

/** Mock Octokit rest.pulls interface */
export interface MockOctokitPulls {
  list: Mock<
    (params: {
      owner: string;
      repo: string;
      state: string;
      head: string;
    }) => ListPullsResponse
  >;
}

/** Mock Octokit rest interface */
export interface MockOctokitRest {
  issues: MockOctokitIssues;
  pulls: MockOctokitPulls;
}

/** Mock Octokit instance */
export interface MockOctokit {
  rest: MockOctokitRest;
}

// ============================================================================
// Mock Implementations
// ============================================================================

/** Default issue comment for mock responses */
const defaultComment: TestIssueComment = {
  id: 1,
  body: "",
  html_url: "https://github.com/comment/1",
};

/** Create fresh mock Octokit instance */
function createMockOctokit(): MockOctokit {
  return {
    rest: {
      issues: {
        listComments: mock(() => Promise.resolve({ data: [] })),
        createComment: mock(() =>
          Promise.resolve({ data: { ...defaultComment } })
        ),
        updateComment: mock(() =>
          Promise.resolve({ data: { ...defaultComment } })
        ),
      },
      pulls: { list: mock(() => Promise.resolve({ data: [] })) },
    },
  };
}

// ============================================================================
// WARNING: SHARED SINGLETON MOCKS - CROSS-TEST CONTAMINATION RISK
// ============================================================================
// The mockOctokit and getOctokit below are SHARED SINGLETONS. Mock call counts
// and state persist across tests unless explicitly reset.
//
// TESTS MUST call clearGitHubMocks() in beforeEach/afterEach to avoid flaky
// tests caused by leftover state from previous test runs.
// ============================================================================

/** Singleton mock Octokit instance */
export const mockOctokit: MockOctokit = createMockOctokit();

/** Mock getOctokit function - returns the singleton mockOctokit */
export const getOctokit: Mock<typeof getOctokitType> = mock(
  () => mockOctokit as unknown as ReturnType<typeof getOctokitType>,
);

// ============================================================================
// Test Helpers
// ============================================================================

/** Reset context to defaults */
function resetContext(): void {
  context.eventName = contextDefaults.eventName;
  context.payload = {};
  context.repo = { ...contextDefaults.repo };
  context.ref = contextDefaults.ref;
  context.issue = { ...contextDefaults.issue };
}

/** Clear all Octokit mocks */
function clearOctokitMocks(): void {
  mockOctokit.rest.issues.listComments.mockClear();
  mockOctokit.rest.issues.createComment.mockClear();
  mockOctokit.rest.issues.updateComment.mockClear();
  mockOctokit.rest.pulls.list.mockClear();

  // Reset default implementations
  mockOctokit.rest.issues.listComments.mockImplementation(() =>
    Promise.resolve({ data: [] })
  );
  mockOctokit.rest.issues.createComment.mockImplementation(() =>
    Promise.resolve({ data: { ...defaultComment } })
  );
  mockOctokit.rest.issues.updateComment.mockImplementation(() =>
    Promise.resolve({ data: { ...defaultComment } })
  );
  mockOctokit.rest.pulls.list.mockImplementation(() =>
    Promise.resolve({ data: [] })
  );
}

/** Clear all GitHub mocks and reset context */
export function clearGitHubMocks(): void {
  resetContext();
  clearOctokitMocks();
  // Reset implementation to match the defensive reset of mockOctokit.rest.*
  getOctokit.mockImplementation(
    () => mockOctokit as unknown as ReturnType<typeof getOctokitType>,
  );
  getOctokit.mockClear();
}

/** Configure context for pull_request event */
export function setContextForPullRequest(prNumber: number, sha: string): void {
  context.eventName = "pull_request";
  context.issue = { number: prNumber };
  context.payload = { pull_request: { head: { sha } } };
}

/** Configure context for push event */
export function setContextForPush(ref: string, afterSha: string): void {
  context.eventName = "push";
  context.ref = ref;
  context.payload = { after: afterSha };
}
