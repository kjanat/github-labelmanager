/**
 * Unit tests for src/codeFence.ts
 */
import { describe, expect, it } from "bun:test";
import { codeFence } from "~/codeFence.ts";

describe("codeFence", () => {
  describe("basic functionality", () => {
    it("wraps code with triple backticks and language", () => {
      const result = codeFence("json", '{"key": "value"}');
      expect(result).toBe('```json\n{"key": "value"}\n```');
    });

    it("handles empty language", () => {
      const result = codeFence("", "plain text");
      expect(result).toBe("```\nplain text\n```");
    });

    it("handles undefined language", () => {
      const result = codeFence(undefined, "plain text");
      expect(result).toBe("```\nplain text\n```");
    });

    it("handles multiline code", () => {
      const code = "line 1\nline 2\nline 3";
      const result = codeFence("text", code);
      expect(result).toBe("```text\nline 1\nline 2\nline 3\n```");
    });

    it("trims code content", () => {
      const result = codeFence("json", '  {"key": "value"}  \n\n');
      expect(result).toBe('```json\n{"key": "value"}\n```');
    });

    it("handles empty code", () => {
      const result = codeFence("json", "");
      expect(result).toBe("```json\n\n```");
    });
  });

  describe("padding", () => {
    it("adds no padding by default", () => {
      const result = codeFence("json", "{}");
      expect(result).toBe("```json\n{}\n```");
      expect(result.startsWith("\n")).toBe(false);
      expect(result.endsWith("\n```")).toBe(true);
    });

    it("adds no padding when pad is false", () => {
      const result = codeFence("json", "{}", false);
      expect(result).toBe("```json\n{}\n```");
    });

    it("adds 2 newlines when pad is true", () => {
      const result = codeFence("json", "{}", true);
      expect(result).toBe("\n\n```json\n{}\n```\n\n");
    });

    it("adds specified number of newlines", () => {
      const result = codeFence("json", "{}", 3);
      expect(result).toBe("\n\n\n```json\n{}\n```\n\n\n");
    });

    it("handles pad = 0", () => {
      const result = codeFence("json", "{}", 0);
      expect(result).toBe("```json\n{}\n```");
    });

    it("handles pad = 1", () => {
      const result = codeFence("json", "{}", 1);
      expect(result).toBe("\n```json\n{}\n```\n");
    });

    it("treats negative padding as 0", () => {
      const result = codeFence("json", "{}", -5);
      expect(result).toBe("```json\n{}\n```");
    });

    it("truncates float padding to integer", () => {
      const result = codeFence("json", "{}", 2.9);
      expect(result).toBe("\n\n```json\n{}\n```\n\n");
    });
  });

  describe("nested backticks handling", () => {
    it("uses 4 backticks when code contains triple backticks", () => {
      const code = '```js\nconsole.log("hello")\n```';
      const result = codeFence("markdown", code);
      expect(result).toBe(
        '````markdown\n```js\nconsole.log("hello")\n```\n````',
      );
    });

    it("uses 5 backticks when code contains 4 backticks", () => {
      const code = "````\nsome code\n````";
      const result = codeFence("text", code);
      expect(result).toBe("`````text\n````\nsome code\n````\n`````");
    });

    it("handles single backticks in code", () => {
      const code = "const x = `template ${literal}`";
      const result = codeFence("js", code);
      // Single backtick needs fence of at least 2, but min is 3
      expect(result).toBe("```js\nconst x = `template ${literal}`\n```");
    });

    it("handles double backticks in code", () => {
      const code = "use ``code`` for inline";
      const result = codeFence("md", code);
      expect(result).toBe("```md\nuse ``code`` for inline\n```");
    });

    it("handles regex patterns with backticks", () => {
      const code = '{"pattern": "^`{3,}$"}';
      const result = codeFence("json", code);
      expect(result).toBe('```json\n{"pattern": "^`{3,}$"}\n```');
    });

    it("handles multiple backtick sequences of different lengths", () => {
      const code = "` `` ``` ```` `````";
      const result = codeFence("text", code);
      // Longest sequence is 5, so fence should be 6
      expect(result).toBe("``````text\n` `` ``` ```` `````\n``````");
    });
  });

  describe("real-world examples", () => {
    it("handles JSON schema with regex pattern", () => {
      const schema = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "pattern": "^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
}`;
      const result = codeFence("json", schema, 2);
      expect(result).toContain("```json");
      expect(result).toContain('"pattern"');
      expect(result.startsWith("\n\n")).toBe(true);
      expect(result.endsWith("\n\n")).toBe(true);
    });

    it("handles diff output", () => {
      const diff = `-old line
+new line
 unchanged`;
      const result = codeFence("diff", diff);
      expect(result).toBe("```diff\n-old line\n+new line\n unchanged\n```");
    });

    it("handles markdown with nested code blocks", () => {
      const markdown = `# Example

\`\`\`js
console.log("hello")
\`\`\`

More text`;
      const result = codeFence("markdown", markdown);
      expect(result.startsWith("````markdown")).toBe(true);
      expect(result.endsWith("\n````")).toBe(true);
    });
  });
});
