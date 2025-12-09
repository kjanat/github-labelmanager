/**
 * Tests for src/comment.ts - Octokit API interactions
 */
import { beforeEach, describe, expect, it } from "bun:test";

import {
  clearAllMocks,
  mockOctokit,
  setupMocks,
  type TestIssueComment,
} from "tests/mocks.ts";
import type { Octokit } from "~/types.ts";

// Setup mocks before importing source
setupMocks();

// Single typed view of the global mock for functions that expect Octokit
const octokit = octokit;

// Import after mocking
const {
  createComment,
  findBotComment,
  findPrForPush,
  updateComment,
  upsertComment,
} = await import("~/comment.ts");

// ============================================================================
// Test Data
// ============================================================================

const ctx = { owner: "test-owner", repo: "test-repo" };
const identifier = "## pkg-pr-new publish";
const commentBody = "Test comment body";

const existingComment: TestIssueComment = {
  id: 123,
  body: `${identifier}\n\nSome content`,
  html_url: "https://github.com/test-owner/test-repo/issues/1#issuecomment-123",
};

const otherComment: TestIssueComment = {
  id: 456,
  body: "Some other comment",
  html_url: "https://github.com/test-owner/test-repo/issues/1#issuecomment-456",
};

const commentWithUndefinedBody: TestIssueComment = {
  id: 789,
  body: undefined,
  html_url: "https://github.com/test-owner/test-repo/issues/1#issuecomment-789",
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  clearAllMocks();
});

// ============================================================================
// findBotComment
// ============================================================================

describe("findBotComment", () => {
  it("returns comment when identifier is found in body", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [otherComment, existingComment],
    });

    const result = await findBotComment(
      octokit,
      ctx,
      1,
      identifier,
    );

    expect(result).toEqual({ id: 123, url: existingComment.html_url });
  });

  it("returns null when no comment matches identifier", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [otherComment],
    });

    const result = await findBotComment(
      octokit,
      ctx,
      1,
      identifier,
    );

    expect(result).toBeNull();
  });

  it("returns null for empty comment list", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({ data: [] });

    const result = await findBotComment(
      octokit,
      ctx,
      1,
      identifier,
    );

    expect(result).toBeNull();
  });

  it("handles comments with undefined body", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [commentWithUndefinedBody],
    });

    const result = await findBotComment(
      octokit,
      ctx,
      1,
      identifier,
    );

    expect(result).toBeNull();
  });

  it("calls listComments with correct parameters", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({ data: [] });

    await findBotComment(octokit, ctx, 42, identifier);

    expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      issue_number: 42,
    });
  });
});

// ============================================================================
// createComment
// ============================================================================

describe("createComment", () => {
  it("returns commentId and commentUrl from response", async () => {
    const newComment: TestIssueComment = {
      id: 999,
      body: commentBody,
      html_url:
        "https://github.com/test-owner/test-repo/issues/1#issuecomment-999",
    };
    mockOctokit.rest.issues.createComment.mockResolvedValueOnce({
      data: newComment,
    });

    const result = await createComment(
      octokit,
      ctx,
      1,
      commentBody,
    );

    expect(result).toEqual({ commentId: 999, commentUrl: newComment.html_url });
  });

  it("calls createComment with correct parameters", async () => {
    await createComment(octokit, ctx, 42, commentBody);

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      issue_number: 42,
      body: commentBody,
    });
  });
});

// ============================================================================
// updateComment
// ============================================================================

describe("updateComment", () => {
  it("returns commentId and commentUrl from response", async () => {
    const updatedComment: TestIssueComment = {
      id: 123,
      body: commentBody,
      html_url:
        "https://github.com/test-owner/test-repo/issues/1#issuecomment-123",
    };
    mockOctokit.rest.issues.updateComment.mockResolvedValueOnce({
      data: updatedComment,
    });

    const result = await updateComment(
      octokit,
      ctx,
      123,
      commentBody,
    );

    expect(result).toEqual({
      commentId: 123,
      commentUrl: updatedComment.html_url,
    });
  });

  it("calls updateComment with correct parameters", async () => {
    await updateComment(octokit, ctx, 123, commentBody);

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      comment_id: 123,
      body: commentBody,
    });
  });
});

// ============================================================================
// upsertComment
// ============================================================================

describe("upsertComment", () => {
  it("creates new comment when no existing comment found", async () => {
    // findBotComment returns null
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({ data: [] });
    // createComment response
    mockOctokit.rest.issues.createComment.mockResolvedValueOnce({
      data: {
        id: 999,
        body: commentBody,
        html_url: "https://github.com/comment/999",
      },
    });

    const result = await upsertComment(
      octokit,
      ctx,
      1,
      commentBody,
      identifier,
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
    expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
    expect(result.commentId).toBe(999);
  });

  it("updates existing comment when found", async () => {
    // findBotComment returns existing comment
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [existingComment],
    });
    // updateComment response
    mockOctokit.rest.issues.updateComment.mockResolvedValueOnce({
      data: {
        id: 123,
        body: commentBody,
        html_url: "https://github.com/comment/123",
      },
    });

    const result = await upsertComment(
      octokit,
      ctx,
      1,
      commentBody,
      identifier,
    );

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    expect(result.commentId).toBe(123);
  });

  it("passes correct comment_id to updateComment", async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [existingComment],
    });
    mockOctokit.rest.issues.updateComment.mockResolvedValueOnce({
      data: existingComment,
    });

    await upsertComment(octokit, ctx, 1, commentBody, identifier);

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 123 }),
    );
  });
});

// ============================================================================
// findPrForPush
// ============================================================================

describe("findPrForPush", () => {
  it("returns PR number when PR found", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({
      data: [{ number: 42 }],
    });

    const result = await findPrForPush(
      octokit,
      ctx,
      "refs/heads/feature/test",
    );

    expect(result).toBe(42);
  });

  it("returns null when no PR found", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({ data: [] });

    const result = await findPrForPush(
      octokit,
      ctx,
      "refs/heads/feature/test",
    );

    expect(result).toBeNull();
  });

  it("returns first PR when multiple found", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({
      data: [{ number: 42 }, { number: 43 }],
    });

    const result = await findPrForPush(
      octokit,
      ctx,
      "refs/heads/feature/test",
    );

    expect(result).toBe(42);
  });

  it("strips refs/heads/ prefix from branch", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({ data: [] });

    await findPrForPush(octokit, ctx, "refs/heads/feature/test");

    expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      state: "open",
      head: "test-owner:feature/test",
    });
  });

  it("handles branch names with slashes", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({ data: [] });

    await findPrForPush(
      octokit,
      ctx,
      "refs/heads/feature/nested/branch",
    );

    expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith(
      expect.objectContaining({ head: "test-owner:feature/nested/branch" }),
    );
  });

  it("handles simple branch ref", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValueOnce({ data: [] });

    await findPrForPush(octokit, ctx, "refs/heads/main");

    expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith(
      expect.objectContaining({ head: "test-owner:main" }),
    );
  });
});
