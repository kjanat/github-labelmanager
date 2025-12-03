/**
 * Tests for config module
 */

import { assertEquals } from "@std/assert";
import { isLabelConfig } from "@/config.ts";

// --- isLabelConfig tests ---

Deno.test("isLabelConfig - validates correct minimal schema", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug report" }],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - validates schema with aliases", () => {
  const valid = {
    labels: [
      {
        name: "bug",
        color: "ff0000",
        description: "Bug report",
        aliases: ["defect", "issue"],
      },
    ],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - validates schema with delete array", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug report" }],
    delete: ["old-label", "deprecated"],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - rejects null", () => {
  assertEquals(isLabelConfig(null), false);
});

Deno.test("isLabelConfig - rejects undefined", () => {
  assertEquals(isLabelConfig(undefined), false);
});

Deno.test("isLabelConfig - rejects non-object", () => {
  assertEquals(isLabelConfig("string"), false);
  assertEquals(isLabelConfig(123), false);
  assertEquals(isLabelConfig([]), false);
});

Deno.test("isLabelConfig - rejects missing labels array", () => {
  assertEquals(isLabelConfig({}), false);
  assertEquals(isLabelConfig({ delete: ["foo"] }), false);
});

Deno.test("isLabelConfig - rejects labels as non-array", () => {
  assertEquals(isLabelConfig({ labels: "not-array" }), false);
  assertEquals(isLabelConfig({ labels: {} }), false);
  assertEquals(isLabelConfig({ labels: null }), false);
});

Deno.test("isLabelConfig - rejects label with missing name", () => {
  const invalid = {
    labels: [{ color: "ff0000", description: "Bug" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects label with missing color", () => {
  const invalid = {
    labels: [{ name: "bug", description: "Bug" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects label with missing description", () => {
  const invalid = {
    labels: [{ name: "bug", color: "ff0000" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects label with non-string name", () => {
  const invalid = {
    labels: [{ name: 123, color: "ff0000", description: "Bug" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects aliases with non-string items", () => {
  const invalid = {
    labels: [
      { name: "bug", color: "ff0000", description: "Bug", aliases: [123] },
    ],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects aliases with mixed types", () => {
  const invalid = {
    labels: [
      {
        name: "bug",
        color: "ff0000",
        description: "Bug",
        aliases: ["valid", 123, "also-valid"],
      },
    ],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects delete with non-string items", () => {
  const invalid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: [123],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects delete as non-array", () => {
  const invalid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: "not-array",
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - accepts empty labels array", () => {
  const valid = { labels: [] };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - accepts empty delete array", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: [],
  };
  assertEquals(isLabelConfig(valid), true);
});
