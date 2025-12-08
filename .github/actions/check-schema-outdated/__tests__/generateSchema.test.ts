/**
 * Unit tests for src/generateSchema.ts using bun:test
 */
import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearAllMocks,
  mockEndGroup,
  mockGetExecOutput,
  mockSetFailed,
  mockStartGroup,
  setupMocks,
} from "./mocks.ts";

// Setup mocks before importing source
setupMocks();

// Import after mocking
const { generateSchema } = await import("~/generateSchema.ts");

describe("generateSchema (bun:test)", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("returns 0 on successful schema generation", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Schema generated",
      stderr: "",
    });

    const result = await generateSchema();

    expect(result).toBe(0);
    expect(mockGetExecOutput).toHaveBeenCalledWith("deno", ["task", "schema"], {
      ignoreReturnCode: true,
    });
  });

  it("returns exit code on failed schema generation", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "Task failed",
    });

    const result = await generateSchema();

    expect(result).toBe(1);
  });

  it("returns non-zero exit code from deno", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 127,
      stdout: "",
      stderr: "command not found",
    });

    const result = await generateSchema();

    expect(result).toBe(127);
  });

  it("returns 1 and calls setFailed when deno command throws", async () => {
    const error = new Error("spawn deno ENOENT");
    mockGetExecOutput.mockRejectedValueOnce(error);

    const result = await generateSchema();

    expect(result).toBe(1);
    expect(mockSetFailed).toHaveBeenCalledWith(
      `Failed to generate schema: ${error}`,
    );
  });

  it("calls startGroup and endGroup", async () => {
    mockGetExecOutput.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await generateSchema();

    expect(mockStartGroup).toHaveBeenCalledWith("Generate schema");
    expect(mockEndGroup).toHaveBeenCalled();
  });

  it("calls endGroup even when an error occurs", async () => {
    mockGetExecOutput.mockRejectedValueOnce(new Error("test error"));

    await generateSchema();

    expect(mockStartGroup).toHaveBeenCalledWith("Generate schema");
    expect(mockEndGroup).toHaveBeenCalled();
  });
});
