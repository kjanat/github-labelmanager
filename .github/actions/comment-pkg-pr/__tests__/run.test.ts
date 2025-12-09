/**
 * Integration tests for src/run.ts
 */
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  cleanupMocks,
  clearAllMocks,
  mockContext,
  mockGetInput,
  mockInfo,
  mockOctokit,
  mockSetOutput,
  mockSummary,
  setContextForPullRequest,
  setContextForPush,
  setupMocks,
} from "tests/mocks.ts";

import type { OutputMetadata } from "~/types.ts";

// Setup mocks before importing source
setupMocks();

// Import after mocking
const { buildCommitUrl, getCommitSha, getInputs, loadOutputFile, run } =
  await import("~/run.ts");

// ============================================================================
// Test Data
// ============================================================================

const validOutput: OutputMetadata = {
  packages: [
    {
      name: "@kjanat/github-labelmanager",
      url: "https://pkg.pr.new/@kjanat/github-labelmanager@abc123",
      shasum: "abc123",
    },
  ],
  templates: [
    { name: "basic", url: "https://stackblitz.com/~/github.com/example" },
  ],
};

const validOutputJson = JSON.stringify(validOutput);

// Mock readFile function
const mockReadFile = mock((path: string) => {
  if (path === "output.json" || path === "custom/path.json") {
    return validOutputJson;
  }
  throw new Error(`ENOENT: no such file or directory, open '${path}'`);
});

// ============================================================================
// Setup
// ============================================================================

afterAll(() => {
  cleanupMocks();
});

beforeEach(() => {
  clearAllMocks();
  mockReadFile.mockClear();

  // Default input values
  mockGetInput.mockImplementation((name: string) => {
    switch (name) {
      case "github-token":
        return "test-token";
      case "output-file":
        return "output.json";
      case "comment-identifier":
        return "## pkg-pr-new publish";
      default:
        return "";
    }
  });
});

// ============================================================================
// getInputs
// ============================================================================

describe("getInputs", () => {
  it("gets github-token as required", () => {
    getInputs();

    expect(mockGetInput).toHaveBeenCalledWith("github-token", {
      required: true,
    });
  });

  it("gets output-file input", () => {
    getInputs();

    expect(mockGetInput).toHaveBeenCalledWith("output-file");
  });

  it("gets comment-identifier input", () => {
    getInputs();

    expect(mockGetInput).toHaveBeenCalledWith("comment-identifier");
  });

  it("uses default output-file when not provided", () => {
    mockGetInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      return "";
    });

    const inputs = getInputs();

    expect(inputs.outputFile).toBe("output.json");
  });

  it("uses default comment-identifier when not provided", () => {
    mockGetInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      return "";
    });

    const inputs = getInputs();

    expect(inputs.commentIdentifier).toBe("## pkg-pr-new publish");
  });

  it("uses provided values when set", () => {
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case "github-token":
          return "custom-token";
        case "output-file":
          return "custom/path.json";
        case "comment-identifier":
          return "## Custom Header";
        default:
          return "";
      }
    });

    const inputs = getInputs();

    expect(inputs.githubToken).toBe("custom-token");
    expect(inputs.outputFile).toBe("custom/path.json");
    expect(inputs.commentIdentifier).toBe("## Custom Header");
  });
});

// ============================================================================
// loadOutputFile
// ============================================================================

describe("loadOutputFile", () => {
  it("parses valid JSON file", () => {
    const result = loadOutputFile("output.json", mockReadFile);

    expect(result).toEqual(validOutput);
  });

  it("throws on file not found", () => {
    expect(() => loadOutputFile("nonexistent.json", mockReadFile)).toThrow(
      "ENOENT",
    );
  });

  it("throws on invalid JSON", () => {
    const invalidJsonReader = mock(() => "{ invalid json }");

    expect(() => loadOutputFile("file.json", invalidJsonReader)).toThrow();
  });

  it("uses provided readFile function", () => {
    loadOutputFile("output.json", mockReadFile);

    expect(mockReadFile).toHaveBeenCalledWith("output.json", "utf8");
  });
});

// ============================================================================
// getCommitSha
// ============================================================================

describe("getCommitSha", () => {
  it("returns SHA from pull_request event payload", () => {
    setContextForPullRequest(1, "pr-sha-abc123");

    const sha = getCommitSha();

    expect(sha).toBe("pr-sha-abc123");
  });

  it("returns SHA from push event payload", () => {
    setContextForPush("refs/heads/main", "push-sha-def456");

    const sha = getCommitSha();

    expect(sha).toBe("push-sha-def456");
  });

  it("throws for unsupported event types", () => {
    mockContext.eventName = "workflow_dispatch";
    mockContext.payload = {};

    expect(() => getCommitSha()).toThrow(
      "Unsupported event type: workflow_dispatch",
    );
  });

  it("throws for schedule event", () => {
    mockContext.eventName = "schedule";
    mockContext.payload = {};

    expect(() => getCommitSha()).toThrow("Unsupported event type: schedule");
  });
});

// ============================================================================
// buildCommitUrl
// ============================================================================

describe("buildCommitUrl", () => {
  it("builds correct URL format", () => {
    const url = buildCommitUrl("abc123");

    expect(url).toBe("https://github.com/test-owner/test-repo/commit/abc123");
  });

  it("uses repo context values", () => {
    mockContext.repo = { owner: "custom-owner", repo: "custom-repo" };

    const url = buildCommitUrl("sha");

    expect(url).toBe("https://github.com/custom-owner/custom-repo/commit/sha");
  });
});

// ============================================================================
// run - pull_request event
// ============================================================================

describe("run - pull_request event", () => {
  beforeEach(() => {
    setContextForPullRequest(42, "pr-sha-123");
    // Setup successful comment creation
    mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });
    mockOctokit.rest.issues.createComment.mockResolvedValue({
      data: {
        id: 999,
        body: "",
        html_url:
          "https://github.com/test-owner/test-repo/issues/42#issuecomment-999",
      },
    });
  });

  it("uses context.issue.number for PR number", async () => {
    await run(mockReadFile);

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 42 }),
    );
  });

  it("sets pr-found output to true", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("pr-found", "true");
  });

  it("sets comment-id output", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("comment-id", "999");
  });

  it("sets comment-url output", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith(
      "comment-url",
      "https://github.com/test-owner/test-repo/issues/42#issuecomment-999",
    );
  });

  it("writes step summary", async () => {
    await run(mockReadFile);

    expect(mockSummary.addRaw).toHaveBeenCalled();
    expect(mockSummary.write).toHaveBeenCalled();
  });

  it("logs loading info", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("Loading output file: output.json");
  });

  it("logs package count", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("Found 1 packages, 1 templates");
  });

  it("logs commit SHA", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("Commit: pr-sha-123");
  });

  it("logs posting message", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("Posting comment to PR #42...");
  });

  it("returns result with prFound true", async () => {
    const result = await run(mockReadFile);

    expect(result.prFound).toBe(true);
    expect(result.commentId).toBe(999);
  });
});

// ============================================================================
// run - push event with PR
// ============================================================================

describe("run - push event with PR", () => {
  beforeEach(() => {
    setContextForPush("refs/heads/feature/test", "push-sha-456");
    // PR found
    mockOctokit.rest.pulls.list.mockResolvedValue({ data: [{ number: 99 }] });
    mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });
    mockOctokit.rest.issues.createComment.mockResolvedValue({
      data: { id: 888, body: "", html_url: "https://github.com/comment/888" },
    });
  });

  it("searches for PR using branch", async () => {
    await run(mockReadFile);

    expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith(
      expect.objectContaining({ head: "test-owner:feature/test" }),
    );
  });

  it("logs push event message", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith(
      "Push event - searching for associated PR...",
    );
  });

  it("logs found PR message", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("Found PR #99");
  });

  it("posts comment to found PR", async () => {
    await run(mockReadFile);

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 99 }),
    );
  });

  it("sets pr-found to true", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("pr-found", "true");
  });
});

// ============================================================================
// run - push event without PR
// ============================================================================

describe("run - push event without PR", () => {
  beforeEach(() => {
    setContextForPush("refs/heads/orphan-branch", "orphan-sha-789");
    // No PR found
    mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
  });

  it("logs no PR found message", async () => {
    await run(mockReadFile);

    expect(mockInfo).toHaveBeenCalledWith("No open PR found for this branch");
  });

  it("sets pr-found to false", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("pr-found", "false");
  });

  it("sets empty comment-id", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("comment-id", "");
  });

  it("sets empty comment-url", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith("comment-url", "");
  });

  it("logs publish info to console", async () => {
    await run(mockReadFile);

    // Should log formatted output containing separator and package info
    const infoCalls = mockInfo.mock.calls.map((call) => call[0]);
    const hasPublishInfo = infoCalls.some(
      (msg: string) =>
        msg.includes("Publish Information") || msg.includes("=".repeat(50)),
    );
    expect(hasPublishInfo).toBe(true);
  });

  it("still writes step summary", async () => {
    await run(mockReadFile);

    expect(mockSummary.write).toHaveBeenCalled();
  });

  it("does not call createComment", async () => {
    await run(mockReadFile);

    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("returns result with prFound false", async () => {
    const result = await run(mockReadFile);

    expect(result.prFound).toBe(false);
    expect(result.commentId).toBeUndefined();
    expect(result.commentUrl).toBeUndefined();
  });
});

// ============================================================================
// run - comment update (upsert)
// ============================================================================

describe("run - comment update", () => {
  beforeEach(() => {
    setContextForPullRequest(42, "pr-sha-123");
    // Existing comment found
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [
        {
          id: 123,
          body: "## pkg-pr-new publish\n\nOld content",
          html_url: "https://github.com/comment/123",
        },
      ],
    });
    mockOctokit.rest.issues.updateComment.mockResolvedValue({
      data: {
        id: 123,
        body: "",
        html_url: "https://github.com/comment/123-updated",
      },
    });
  });

  it("updates existing comment instead of creating", async () => {
    await run(mockReadFile);

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("sets comment-url to updated URL", async () => {
    await run(mockReadFile);

    expect(mockSetOutput).toHaveBeenCalledWith(
      "comment-url",
      "https://github.com/comment/123-updated",
    );
  });
});

// ============================================================================
// run - error handling
// ============================================================================

describe("run - error handling", () => {
  it("propagates file read errors", async () => {
    setContextForPullRequest(1, "sha");

    const errorReader = mock(() => {
      throw new Error("ENOENT: file not found");
    });

    await expect(run(errorReader)).rejects.toThrow("ENOENT");
  });

  it("propagates JSON parse errors", async () => {
    setContextForPullRequest(1, "sha");

    const invalidJsonReader = mock(() => "not valid json");

    await expect(run(invalidJsonReader)).rejects.toThrow();
  });

  it("propagates unsupported event errors", async () => {
    mockContext.eventName = "release";
    mockContext.payload = {};

    await expect(run(mockReadFile)).rejects.toThrow("Unsupported event type");
  });

  it("propagates API errors", async () => {
    setContextForPullRequest(1, "sha");
    mockOctokit.rest.issues.listComments.mockRejectedValueOnce(
      new Error("API rate limit exceeded"),
    );

    await expect(run(mockReadFile)).rejects.toThrow("API rate limit exceeded");
  });
});

// ============================================================================
// run - step summary content
// ============================================================================

describe("run - step summary content", () => {
  beforeEach(() => {
    setContextForPullRequest(1, "sha");
    mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });
    mockOctokit.rest.issues.createComment.mockResolvedValue({
      data: { id: 1, body: "", html_url: "https://github.com/comment/1" },
    });
  });

  it("summary contains package info", async () => {
    await run(mockReadFile);

    const addRawCall = mockSummary.addRaw.mock.calls[0];
    const summaryContent = addRawCall?.[0] as string;

    expect(summaryContent).toContain("@kjanat/github-labelmanager");
  });

  it("summary contains template info", async () => {
    await run(mockReadFile);

    const addRawCall = mockSummary.addRaw.mock.calls[0];
    const summaryContent = addRawCall?.[0] as string;

    expect(summaryContent).toContain("basic");
  });

  it("summary contains commit link", async () => {
    await run(mockReadFile);

    const addRawCall = mockSummary.addRaw.mock.calls[0];
    const summaryContent = addRawCall?.[0] as string;

    expect(summaryContent).toContain("[View Commit]");
  });

  it("summary shows success status when PR found", async () => {
    await run(mockReadFile);

    const addRawCall = mockSummary.addRaw.mock.calls[0];
    const summaryContent = addRawCall?.[0] as string;

    expect(summaryContent).toContain(":white_check_mark:");
  });
});
