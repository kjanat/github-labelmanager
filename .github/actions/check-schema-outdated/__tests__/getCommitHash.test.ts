/**
 * Unit tests for src/getCommitHash.ts using bun:test
 */
import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearAllMocks,
  mockEndGroup,
  mockGetExecOutput,
  mockSetFailed,
  mockSetOutput,
  mockStartGroup,
  setupMocks,
} from "./mocks.ts";

// Setup mocks before importing source
setupMocks();

// Import after mocking
const { getCommitHash } = await import("~/getCommitHash.ts");

describe("getCommitHash (bun:test)", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("returns trimmed hash on success", async () => {
    const hash = "abc123def456";
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: `${hash}\n`,
      stderr: "",
    });

    const result = await getCommitHash();

    expect(result).toBe(hash);
  });

  it("sets commit-hash output", async () => {
    const hash = "abc123def456";
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: `${hash}\n`,
      stderr: "",
    });

    await getCommitHash();

    expect(mockSetOutput).toHaveBeenCalledWith("commit-hash", hash);
  });

  it("calls git rev-parse HEAD", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "abc123\n",
      stderr: "",
    });

    await getCommitHash();

    expect(mockGetExecOutput).toHaveBeenCalledWith("git", [
      "rev-parse",
      "HEAD",
    ]);
  });

  it("returns empty string and calls setFailed on error", async () => {
    const error = new Error("spawn git ENOENT");
    mockGetExecOutput.mockRejectedValueOnce(error);

    const result = await getCommitHash();

    expect(result).toBe("");
    expect(mockSetFailed).toHaveBeenCalledWith(
      `Failed to get commit hash: ${error}`,
    );
  });

  it("calls startGroup and endGroup", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "abc123\n",
      stderr: "",
    });

    await getCommitHash();

    expect(mockStartGroup).toHaveBeenCalledWith("Get commit hash");
    expect(mockEndGroup).toHaveBeenCalled();
  });

  it("calls endGroup even when an error occurs", async () => {
    mockGetExecOutput.mockRejectedValueOnce(new Error("test error"));

    await getCommitHash();

    expect(mockStartGroup).toHaveBeenCalledWith("Get commit hash");
    expect(mockEndGroup).toHaveBeenCalled();
  });

  it("handles not a git repository error", async () => {
    const error = new Error("fatal: not a git repository");
    mockGetExecOutput.mockRejectedValueOnce(error);

    const result = await getCommitHash();

    expect(result).toBe("");
    expect(mockSetFailed).toHaveBeenCalledWith(
      `Failed to get commit hash: ${error}`,
    );
  });

  it("handles full 40-character SHA", async () => {
    const fullSha = "a".repeat(40);
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: `${fullSha}\n`,
      stderr: "",
    });

    const result = await getCommitHash();

    expect(result).toBe(fullSha);
    expect(mockSetOutput).toHaveBeenCalledWith("commit-hash", fullSha);
  });
});
