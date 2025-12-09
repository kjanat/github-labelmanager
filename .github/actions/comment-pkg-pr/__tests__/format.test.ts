/**
 * Tests for src/format.ts - pure functions, no mocks needed
 */
import { describe, expect, it } from "bun:test";

import {
  buildCommentBody,
  buildStepSummary,
  formatLogOutput,
  formatPackages,
  formatTemplates,
} from "~/format.ts";
import type { OutputMetadata } from "~/types.ts";

// ============================================================================
// Test Data
// ============================================================================

const singlePackage: OutputMetadata["packages"] = [
  {
    name: "@kjanat/github-labelmanager",
    url: "https://pkg.pr.new/@kjanat/github-labelmanager@abc123",
    shasum: "abc123def456",
  },
];

const multiplePackages: OutputMetadata["packages"] = [
  { name: "@pkg/one", url: "https://pkg.pr.new/@pkg/one@1", shasum: "sha1" },
  { name: "@pkg/two", url: "https://pkg.pr.new/@pkg/two@2", shasum: "sha2" },
  {
    name: "@pkg/three",
    url: "https://pkg.pr.new/@pkg/three@3",
    shasum: "sha3",
  },
];

const singleTemplate: OutputMetadata["templates"] = [
  { name: "basic", url: "https://stackblitz.com/~/github.com/example/basic" },
];

const multipleTemplates: OutputMetadata["templates"] = [
  { name: "template-a", url: "https://example.com/a" },
  { name: "template-b", url: "https://example.com/b" },
];

const fullOutput: OutputMetadata = {
  packages: singlePackage,
  templates: singleTemplate,
};

const emptyOutput: OutputMetadata = { packages: [], templates: [] };

const commitUrl = "https://github.com/test-owner/test-repo/commit/abc123";
const identifier = "## pkg-pr-new publish";

// ============================================================================
// formatPackages
// ============================================================================

describe("formatPackages", () => {
  it("returns placeholder for empty array", () => {
    const result = formatPackages([]);
    expect(result).toBe("_No packages published_");
  });

  it("formats single package with backticks and URL", () => {
    const result = formatPackages(singlePackage);
    expect(result).toBe(
      "- `@kjanat/github-labelmanager`: https://pkg.pr.new/@kjanat/github-labelmanager@abc123",
    );
  });

  it("formats multiple packages as newline-separated list", () => {
    const result = formatPackages(multiplePackages);
    const lines = result.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("- `@pkg/one`: https://pkg.pr.new/@pkg/one@1");
    expect(lines[1]).toBe("- `@pkg/two`: https://pkg.pr.new/@pkg/two@2");
    expect(lines[2]).toBe("- `@pkg/three`: https://pkg.pr.new/@pkg/three@3");
  });
});

// ============================================================================
// formatTemplates
// ============================================================================

describe("formatTemplates", () => {
  it("returns placeholder for empty array", () => {
    const result = formatTemplates([]);
    expect(result).toBe("_No templates available_");
  });

  it("formats single template as markdown link", () => {
    const result = formatTemplates(singleTemplate);
    expect(result).toBe(
      "- [basic](https://stackblitz.com/~/github.com/example/basic)",
    );
  });

  it("formats multiple templates as newline-separated list", () => {
    const result = formatTemplates(multipleTemplates);
    const lines = result.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("- [template-a](https://example.com/a)");
    expect(lines[1]).toBe("- [template-b](https://example.com/b)");
  });
});

// ============================================================================
// buildCommentBody
// ============================================================================

describe("buildCommentBody", () => {
  it("includes identifier at the start", () => {
    const result = buildCommentBody(fullOutput, commitUrl, identifier);
    expect(result.startsWith(identifier)).toBe(true);
  });

  it("includes Published Packages section", () => {
    const result = buildCommentBody(fullOutput, commitUrl, identifier);
    expect(result).toContain("### Published Packages");
    expect(result).toContain("`@kjanat/github-labelmanager`");
  });

  it("includes Templates section", () => {
    const result = buildCommentBody(fullOutput, commitUrl, identifier);
    expect(result).toContain("### Templates");
    expect(result).toContain("[basic]");
  });

  it("includes commit link at the end", () => {
    const result = buildCommentBody(fullOutput, commitUrl, identifier);
    expect(result).toContain(`[View Commit](${commitUrl})`);
  });

  it("handles empty packages and templates", () => {
    const result = buildCommentBody(emptyOutput, commitUrl, identifier);
    expect(result).toContain("_No packages published_");
    expect(result).toContain("_No templates available_");
  });

  it("uses custom identifier", () => {
    const customId = "## Custom Header";
    const result = buildCommentBody(fullOutput, commitUrl, customId);
    expect(result.startsWith(customId)).toBe(true);
    expect(result).not.toContain("## pkg-pr-new publish");
  });
});

// ============================================================================
// buildStepSummary
// ============================================================================

describe("buildStepSummary", () => {
  it("includes main heading", () => {
    const result = buildStepSummary(fullOutput, commitUrl, true);
    expect(result).toContain("# pkg-pr-new Publish Results");
  });

  it("shows success status when PR found", () => {
    const result = buildStepSummary(fullOutput, commitUrl, true);
    expect(result).toContain(":white_check_mark: Comment posted to PR");
    expect(result).not.toContain(":information_source:");
  });

  it("shows info status when no PR found", () => {
    const result = buildStepSummary(fullOutput, commitUrl, false);
    expect(result).toContain(
      ":information_source: No PR found, logged to console only",
    );
    expect(result).not.toContain(":white_check_mark:");
  });

  it("includes Published Packages section", () => {
    const result = buildStepSummary(fullOutput, commitUrl, true);
    expect(result).toContain("## Published Packages");
  });

  it("includes Templates section", () => {
    const result = buildStepSummary(fullOutput, commitUrl, true);
    expect(result).toContain("## Templates");
  });

  it("includes commit link", () => {
    const result = buildStepSummary(fullOutput, commitUrl, true);
    expect(result).toContain(`[View Commit](${commitUrl})`);
  });

  it("handles empty output", () => {
    const result = buildStepSummary(emptyOutput, commitUrl, false);
    expect(result).toContain("_No packages published_");
    expect(result).toContain("_No templates available_");
  });
});

// ============================================================================
// formatLogOutput
// ============================================================================

describe("formatLogOutput", () => {
  it("includes separator lines", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    const separator = "=".repeat(50);
    expect(result).toContain(separator);
  });

  it("includes Publish Information header", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain("Publish Information");
  });

  it("includes Published Packages section", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain("Published Packages:");
    expect(result).toContain("@kjanat/github-labelmanager");
  });

  it("includes Templates section", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain("Templates:");
    expect(result).toContain("basic");
  });

  it("includes commit URL", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain(`Commit URL: ${commitUrl}`);
  });

  it("shows (none) for empty packages", () => {
    const result = formatLogOutput(emptyOutput, commitUrl);
    expect(result).toContain("(none)");
  });

  it("shows (none) for empty templates", () => {
    const result = formatLogOutput(emptyOutput, commitUrl);
    // Count occurrences of (none) - should be 2 (one for packages, one for templates)
    const noneCount = (result.match(/\(none\)/g) || []).length;
    expect(noneCount).toBe(2);
  });

  it("formats packages with indentation", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain("  - @kjanat/github-labelmanager:");
  });

  it("formats templates with indentation", () => {
    const result = formatLogOutput(fullOutput, commitUrl);
    expect(result).toContain("  - basic:");
  });
});
