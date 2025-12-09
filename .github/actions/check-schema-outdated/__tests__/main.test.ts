/**
 * Unit tests for the action's main functionality, src/main.ts using bun:test
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import {
  cleanupMocks,
  clearAllMocks,
  mockContext,
  mockGetExecOutput,
  mockGetInput,
  mockSetFailed,
  mockSetOutput,
  mockSummary,
  mockToPlatformPath,
  setupMocks,
  setWebSource,
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
      // generateSchema, checkSchemaDiff
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
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
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

      await run(mockReadFile);

      expect(mockSetOutput).toHaveBeenCalledWith("file", platformPath);
    });

    it("sets commit-hash output from github context", async () => {
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

      await run(mockReadFile);

      expect(mockSetOutput).toHaveBeenCalledWith(
        "commit-hash",
        mockContext.sha,
      );
    });
  });

  describe("schema generation", () => {
    it("fails when schema generation returns non-zero exit code", async () => {
      mockGetExecOutput.mockResolvedValueOnce({
        exitCode: 1,
        stdout: "",
        stderr: "error",
      });

      await run(mockReadFile);

      expect(mockSetFailed).toHaveBeenCalledWith(
        "Schema generation failed with exit code 1",
      );
    });

    it("does not check diff when schema generation fails", async () => {
      mockGetExecOutput.mockResolvedValueOnce({
        exitCode: 127,
        stdout: "",
        stderr: "",
      });

      await run(mockReadFile);

      // Only generateSchema is called, not checkSchemaDiff
      expect(mockGetExecOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe("schema up-to-date", () => {
    beforeEach(() => {
      // generateSchema, checkSchemaDiff
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
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
      // generateSchema, checkSchemaDiff (with diff)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
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

    it("adds diff to summary in details block", async () => {
      await run(mockReadFile);

      expect(mockSummary.addDetails).toHaveBeenCalledWith(
        "View diff",
        `\n\n\`\`\`diff\n${diffContent}\n\`\`\`\n\n`,
      );
    });

    it("adds file info with permalink to summary", async () => {
      await run(mockReadFile);

      const expectedPermalink =
        `${mockContext.serverUrl}/${mockContext.repo.owner}/${mockContext.repo.repo}/blob/${mockContext.sha}/${testFile}`;
      expect(mockSummary.addRaw).toHaveBeenCalledWith(
        `**File:** [\`${testFile}\`](${expectedPermalink})`,
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
        `\n\n\`\`\`json\n${fileContent}\n\`\`\`\n\n`,
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
      expect(written).toContain("<details><summary>View diff</summary>");
      expect(written).toContain("```diff");
      expect(written).toContain(diffContent);
      expect(written).toContain("<blockquote>");
      expect(written).toContain(
        "<details><summary>View generated schema</summary>",
      );
      expect(written).toContain("```json");
    });
  });

  describe("git diff error", () => {
    it("fails when git diff returns exit code > 1", async () => {
      // generateSchema, checkSchemaDiff (error)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
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
      // generateSchema, checkSchemaDiff (error)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
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

  describe("file read error handling", () => {
    it("propagates error when readFile throws", async () => {
      // generateSchema, checkSchemaDiff (outdated)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      mockReadFile.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(run(mockReadFile)).rejects.toThrow("ENOENT");
    });

    it("propagates error when readFile throws permission denied", async () => {
      // generateSchema, checkSchemaDiff (outdated)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      mockReadFile.mockImplementation(() => {
        throw new Error("EACCES: permission denied");
      });

      await expect(run(mockReadFile)).rejects.toThrow("EACCES");
    });
  });

  describe("default readFile parameter", () => {
    it("uses default readFile when no argument provided", async () => {
      // generateSchema, checkSchemaDiff (outdated)
      mockGetExecOutput
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "diff", stderr: "" });

      // When schema is outdated, run() tries to read the file
      // Since file doesn't exist, it throws ENOENT
      await expect(run()).rejects.toThrow("ENOENT");
    });
  });
});

describe("core fixture coverage", () => {
  const JSON_SOURCE =
    "https://cdn.jsdelivr.net/gh/kjanat/github-labelmanager@6dcde0c/.github/labels.schema.json";
  // Plain text file (not JSON) - triggers the catch block in setWebSource
  const TEXT_SOURCE =
    "https://cdn.jsdelivr.net/gh/kjanat/github-labelmanager@6dcde0c/README.md";

  afterEach(() => {
    mockSummary._reset();
  });

  describe("addCodeBlock", () => {
    it("generates HTML pre/code block with lang attribute", () => {
      mockSummary._reset();
      mockSummary.addCodeBlock("const x = 1;", "typescript");
      expect(mockSummary._buffer).toBe(
        '<pre lang="typescript"><code>const x = 1;</code></pre>\n',
      );
    });

    it("generates HTML pre/code block without lang attribute", () => {
      mockSummary._reset();
      mockSummary.addCodeBlock("plain text");
      expect(mockSummary._buffer).toBe("<pre><code>plain text</code></pre>\n");
    });
  });

  describe("addDetails with web source replacement", () => {
    it("replaces HTML pre/code JSON content with web source", async () => {
      await setWebSource(JSON_SOURCE);
      mockSummary._reset();
      mockSummary.addDetails(
        "Schema",
        '<pre lang="json"><code>{"old": true}</code></pre>',
      );
      expect(mockSummary._buffer).toContain("$schema");
      expect(mockSummary._buffer).not.toContain('"old": true');
    });
  });

  describe("setWebSource with non-JSON response", () => {
    it("handles non-JSON web source gracefully", async () => {
      await setWebSource(TEXT_SOURCE);
      mockSummary._reset();
      // Should work without throwing - content is stored as-is
      mockSummary.addDetails("Test", "```json\n{}\n```");
      // README.md content should be in buffer (not JSON-parsed)
      expect(mockSummary._buffer).toContain("github-labelmanager");
      // Should NOT contain $schema (which would indicate JSON was parsed)
      expect(mockSummary._buffer).not.toContain('"$schema"');
    });

    it("clears web source when null is passed", async () => {
      await setWebSource(JSON_SOURCE);
      await setWebSource(null);
      mockSummary._reset();
      mockSummary.addDetails("Test", "```json\n{}\n```");
      // Original content should remain unchanged
      expect(mockSummary._buffer).toContain("{}");
      expect(mockSummary._buffer).not.toContain("$schema");
    });

    it("handles fetch errors gracefully", async () => {
      // Invalid URL triggers fetch error catch block
      await setWebSource("http://invalid.localhost.test:99999/nonexistent");
      mockSummary._reset();
      mockSummary.addDetails("Test", "```json\n{}\n```");
      // Content should remain unchanged (fetch failed silently)
      expect(mockSummary._buffer).toContain("{}");
    });
  });
});
