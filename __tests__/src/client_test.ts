/**
 * Tests for LabelManager
 * @module
 */

import { assertEquals } from "@std/assert";
import { LabelManager } from "~/client.ts";

// =============================================================================
// LabelManager.formatError tests
// =============================================================================

Deno.test("formatError - formats object with status and message", () => {
  const error = { status: 404, message: "Not found" };
  const result = LabelManager.formatError(error);
  assertEquals(result, "404 - Not found");
});

Deno.test("formatError - handles object with only message", () => {
  const error = { message: "Something went wrong" };
  const result = LabelManager.formatError(error);
  assertEquals(result, "unknown - Something went wrong");
});

Deno.test("formatError - handles object without message", () => {
  const error = { status: 500, code: "INTERNAL" };
  const result = LabelManager.formatError(error);
  assertEquals(result, '500 - {"status":500,"code":"INTERNAL"}');
});

Deno.test("formatError - handles string error", () => {
  const error = "Connection refused";
  const result = LabelManager.formatError(error);
  assertEquals(result, "Connection refused");
});

Deno.test("formatError - handles null", () => {
  const result = LabelManager.formatError(null);
  assertEquals(result, "null");
});

Deno.test("formatError - handles undefined", () => {
  const result = LabelManager.formatError(undefined);
  assertEquals(result, "undefined");
});
