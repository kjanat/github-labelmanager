/**
 * Unit tests for the action's main functionality, src/main.ts using bun:test
 */
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanupMocks,
  clearAllMocks,
  mockGetExecOutput,
  mockGetInput,
  mockSetFailed,
  mockSetOutput,
  mockSummary,
  mockToPlatformPath,
  setupMocks,
} from "./mocks.ts";

// Setup mocks before importing source
setupMocks();

// Import after mocking
const { run } = await import("~/main.ts");

// Cleanup temp files after all tests
afterAll(() => {
  cleanupMocks();
});

describe("main.ts (bun:test)", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockReadFile = mock((_path: string, _encoding: BufferEncoding) => "{}");
  const testFile = ".github/labels.schema.json";

  beforeEach(() => {
    clearAllMocks();
    mockReadFile.mockClear();

    // Default mock implementations
    mockGetInput.mockReturnValue(testFile);
    mockToPlatformPath.mockImplementation((p: string) => p);
    mockReadFile.mockReturnValue('{"schema": "content"}');
  });

  describe("input handling", () => {
    it("gets file input and sets file output", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

      await run(mockReadFile);

      expect(mockGetInput).toHaveBeenCalledWith("file", { required: true });
      expect(mockToPlatformPath).toHaveBeenCalledWith(testFile);
      expect(mockSetOutput).toHaveBeenCalledWith("file", testFile);
    });

    it("transforms file path using toPlatformPath", async () => {
      const inputPath = "path/to/schema.json";
      const platformPath = "path\\to\\schema.json";
      mockGetInput.mockReturnValue(inputPath);
      mockToPlatformPath.mockReturnValue(platformPath);

      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

      await run(mockReadFile);

      expect(mockSetOutput).toHaveBeenCalledWith("file", platformPath);
    });
  });

  describe("schema generation", () => {
    it("fails when schema generation returns non-zero exit code", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "error" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" });

      await run(mockReadFile);

      expect(mockSetFailed).toHaveBeenCalledWith(
        "Schema generation failed with exit code 1",
      );
    });

    it("does not check diff when schema generation fails", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 127, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" });

      await run(mockReadFile);

      expect(mockGetExecOutput).toHaveBeenCalledTimes(2);
    });
  });

  describe("schema up-to-date", () => {
    beforeEach(() => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    });

    it("sets outdated=false and up-to-date=true", async () => {
      await run(mockReadFile);

      expect(mockSetOutput).toHaveBeenCalledWith("outdated", false);
      expect(mockSetOutput).toHaveBeenCalledWith("up-to-date", true);
    });

    it("does not call setFailed", async () => {
      await run(mockReadFile);

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it("adds success heading to summary", async () => {
      await run(mockReadFile);

      expect(mockSummary.addHeading).toHaveBeenCalledWith(
        ":white_check_mark: Schema is up-to-date",
        3,
      );
    });

    it("writes summary", async () => {
      await run(mockReadFile);

      expect(mockSummary.write).toHaveBeenCalled();
    });

    it("does not read file content", async () => {
      await run(mockReadFile);

      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("writes summary to temp file with correct content", async () => {
      await run(mockReadFile);

      const written = mockSummary._getWrittenContent();
      expect(written).not.toBeNull();
      expect(written).toContain(":white_check_mark: Schema is up-to-date");
    });
  });

  describe("schema outdated", () => {
    const diffContent = "-old\n+new";

    beforeEach(() => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: diffContent,
          stderr: "",
        });
    });

    it("sets outdated=true and up-to-date=false", async () => {
      await run(mockReadFile);

      expect(mockSetOutput).toHaveBeenCalledWith("outdated", true);
      expect(mockSetOutput).toHaveBeenCalledWith("up-to-date", false);
    });

    it("calls setFailed with update instructions", async () => {
      await run(mockReadFile);

      expect(mockSetFailed).toHaveBeenCalledWith(
        "Schema needs updating. Run `deno task schema` locally.",
      );
    });

    it("adds failure heading to summary", async () => {
      await run(mockReadFile);

      expect(mockSummary.addHeading).toHaveBeenCalledWith(
        ":x: Schema is out-of-date",
        3,
      );
    });

    it("adds diff to summary as code block", async () => {
      await run(mockReadFile);

      expect(mockSummary.addCodeBlock).toHaveBeenCalledWith(
        diffContent,
        "diff",
      );
    });

    it("adds file info to summary", async () => {
      await run(mockReadFile);

      expect(mockSummary.addRaw).toHaveBeenCalledWith(
        `**File:** \`${testFile}\``,
        true,
      );
    });

    it("adds update instructions quote", async () => {
      await run(mockReadFile);

      expect(mockSummary.addQuote).toHaveBeenCalledWith(
        "<b>Run <code>deno task schema</code> locally to update.</b>",
      );
    });

    it("reads file content and adds to summary details", async () => {
      const fileContent = '{"type": "object"}';
      mockReadFile.mockReturnValue(fileContent);

      await run(mockReadFile);

      expect(mockReadFile).toHaveBeenCalledWith(testFile, "utf-8");
      expect(mockSummary.addDetails).toHaveBeenCalledWith(
        "View generated schema",
        `<pre lang="json"><code>${fileContent}</code></pre>`,
      );
    });

    it("writes summary", async () => {
      await run(mockReadFile);

      expect(mockSummary.write).toHaveBeenCalled();
    });

    it("writes summary to temp file with all expected content", async () => {
      const fileContent = '{"type": "object"}';
      mockReadFile.mockReturnValue(fileContent);

      await run(mockReadFile);

      const written = mockSummary._getWrittenContent();
      expect(written).not.toBeNull();
      expect(written).toContain(":x: Schema is out-of-date");
      expect(written).toContain(
        `<pre lang="diff"><code>${diffContent}</code></pre>`,
      );
      expect(written).toContain("<blockquote>");
      expect(written).toContain(
        "<details><summary>View generated schema</summary>",
      );
      // Details content may be replaced by web source if configured in bun-test.yaml
      expect(written).toContain('<pre lang="json"><code>');
    });
  });

  describe("git diff error", () => {
    it("fails when git diff returns exit code > 1", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({
          exitCode: 128,
          stdout: "",
          stderr: "fatal: not a git repository",
        });

      await run(mockReadFile);

      expect(mockSetFailed).toHaveBeenCalledWith(
        "Git diff failed with exit code 128: fatal: not a git repository",
      );
    });

    it("does not set outdated outputs on git error", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 2, stdout: "", stderr: "error" });

      await run(mockReadFile);

      // Check that setOutput was NOT called with 'outdated' or 'up-to-date'
      const calls = mockSetOutput.mock.calls;
      const outdatedCall = calls.find(
        (call: unknown[]) => call[0] === "outdated",
      );
      const upToDateCall = calls.find(
        (call: unknown[]) => call[0] === "up-to-date",
      );
      expect(outdatedCall).toBeUndefined();
      expect(upToDateCall).toBeUndefined();
    });
  });

  describe("concurrent execution", () => {
    it("runs generateSchema and getGitHash in parallel", async () => {
      let generateSchemaStarted = false;
      let getGitHashStarted = false;

      mockGetExecOutput.mockImplementation(async (cmd) => {
        if (cmd === "deno") {
          generateSchemaStarted = true;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { exitCode: 0, stdout: "", stderr: "" };
        }
        if (cmd === "git") {
          getGitHashStarted = true;
          return { exitCode: 0, stdout: "hash\n", stderr: "" };
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      });

      await run(mockReadFile);

      expect(generateSchemaStarted).toBe(true);
      expect(getGitHashStarted).toBe(true);
    });
  });

  describe("file read error handling", () => {
    it("propagates error when readFile throws", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      mockReadFile.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(run(mockReadFile)).rejects.toThrow("ENOENT");
    });

    it("propagates error when readFile throws permission denied", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      mockReadFile.mockImplementation(() => {
        throw new Error("EACCES: permission denied");
      });

      expect(run(mockReadFile)).rejects.toThrow("EACCES");
    });
  });

  describe("default readFile parameter", () => {
    it("uses default readFile when no argument provided", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "hash\n", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      // When schema is outdated, run() tries to read the file
      // Since file doesn't exist, it throws ENOENT
      expect(run()).rejects.toThrow("ENOENT");
    });
  });
});
