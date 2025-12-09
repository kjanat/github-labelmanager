/**
 * Unit tests for src/checkSchemaDiff.ts using bun:test
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
const { checkSchemaDiff } = await import("~/checkSchemaDiff.ts");

describe("checkSchemaDiff (bun:test)", () => {
  const testFile = "test/schema.json";

  beforeEach(() => {
    clearAllMocks();
  });

  it("returns exitCode 0 with empty diff when no changes", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    const result = await checkSchemaDiff(testFile);

    expect(result).toEqual({ exitCode: 0, diff: "", error: "" });
    expect(mockGetExecOutput).toHaveBeenCalledWith(
      "git",
      ["diff", "--exit-code", "--color=never", testFile],
      { ignoreReturnCode: true },
    );
  });

  it("returns exitCode 1 with diff content when schema changed", async () => {
    const diffContent = "-old line\n+new line";
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 1,
      stdout: diffContent,
      stderr: "",
    });

    const result = await checkSchemaDiff(testFile);

    expect(result).toEqual({ exitCode: 1, diff: diffContent, error: "" });
  });

  it("trims whitespace from diff output", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "  diff content  \n",
      stderr: "",
    });

    const result = await checkSchemaDiff(testFile);

    expect(result.diff).toBe("diff content");
  });

  it("returns exitCode >1 with stderr on git error", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 128,
      stdout: "",
      stderr: "fatal: not a git repository",
    });

    const result = await checkSchemaDiff(testFile);

    expect(result).toEqual({
      exitCode: 128,
      diff: "",
      error: "fatal: not a git repository",
    });
  });

  it("returns exitCode 128 with error message on exception", async () => {
    const error = new Error("spawn git ENOENT");
    mockGetExecOutput.mockRejectedValueOnce(error);

    const result = await checkSchemaDiff(testFile);

    // Implementation returns error.stack ?? error.message, not String(error)
    // setFailed is NOT called - run() handles failure via exitCode > 1 check
    expect(result.exitCode).toBe(128);
    expect(result.diff).toBe("");
    expect(result.error).toContain("spawn git ENOENT");
  });

  it("sets git-diff output", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "diff output",
      stderr: "",
    });

    await checkSchemaDiff(testFile);

    expect(mockSetOutput).toHaveBeenCalledWith("git-diff", "diff output");
  });

  it("calls startGroup and endGroup", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await checkSchemaDiff(testFile);

    expect(mockStartGroup).toHaveBeenCalledWith("Check schema diff");
    expect(mockEndGroup).toHaveBeenCalled();
  });

  it("calls endGroup even when an error occurs", async () => {
    mockGetExecOutput.mockRejectedValueOnce(new Error("test error"));

    await checkSchemaDiff(testFile);

    expect(mockStartGroup).toHaveBeenCalledWith("Check schema diff");
    expect(mockEndGroup).toHaveBeenCalled();
  });

  it("handles file paths with spaces", async () => {
    const fileWithSpaces = "path/to/my schema.json";
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await checkSchemaDiff(fileWithSpaces);

    expect(mockGetExecOutput).toHaveBeenCalledWith(
      "git",
      ["diff", "--exit-code", "--color=never", fileWithSpaces],
      { ignoreReturnCode: true },
    );
  });

  it("handles permission denied error", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 128,
      stdout: "",
      stderr: "error: could not read file: Permission denied",
    });

    const result = await checkSchemaDiff(testFile);

    expect(result.exitCode).toBe(128);
    expect(result.error).toContain("Permission denied");
  });
});
