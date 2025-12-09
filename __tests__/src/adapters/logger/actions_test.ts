/**
 * Tests for ActionsLogger
 *
 * Uses createMockActionsCore from testing.ts for mock @actions/core.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  type ActionsCore,
  ActionsLogger,
  toActionsAnnotation,
} from "~/adapters/logger/actions.ts";
import type { SyncOperation, SyncResult } from "~/types.ts";
import { type CoreCall, createMockActionsCore } from "~/testing.ts";

/** Helper to create mock core with ActionsCore typing */
function createMockCore(): { core: ActionsCore; calls: CoreCall[] } {
  const { core, calls } = createMockActionsCore();
  return { core: core as unknown as ActionsCore, calls };
}

// =============================================================================
// toActionsAnnotation tests
// =============================================================================

Deno.test("toActionsAnnotation - returns undefined for undefined input", () => {
  assertEquals(toActionsAnnotation(undefined), undefined);
});

Deno.test("toActionsAnnotation - maps all properties", () => {
  const result = toActionsAnnotation({
    title: "Test Title",
    file: "test.yml",
    startLine: 10,
    endLine: 15,
    startColumn: 5,
    endColumn: 20,
  });

  assertEquals(result, {
    title: "Test Title",
    file: "test.yml",
    startLine: 10,
    endLine: 15,
    startColumn: 5,
    endColumn: 20,
  });
});

Deno.test("toActionsAnnotation - handles partial properties", () => {
  const result = toActionsAnnotation({
    file: "config.yml",
    startLine: 5,
  });

  assertEquals(result?.file, "config.yml");
  assertEquals(result?.startLine, 5);
  assertEquals(result?.title, undefined);
});

// =============================================================================
// Basic logging tests
// =============================================================================

Deno.test("ActionsLogger - debug calls core.debug", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.debug("debug message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "debug");
  assertEquals(calls[0].args, ["debug message"]);
});

Deno.test("ActionsLogger - info calls core.info", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.info("info message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "info");
  assertEquals(calls[0].args, ["info message"]);
});

Deno.test("ActionsLogger - warn calls core.warning with properties", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.warn("warning message", { file: "test.yml", startLine: 5 });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "warning");
  assertEquals(calls[0].args[0], "warning message");
  assertEquals(calls[0].args[1], {
    title: undefined,
    file: "test.yml",
    startLine: 5,
    endLine: undefined,
    startColumn: undefined,
    endColumn: undefined,
  });
});

Deno.test("ActionsLogger - error calls core.error with properties", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.error("error message", { title: "Error Title" });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "error");
  assertEquals(calls[0].args[0], "error message");
});

Deno.test("ActionsLogger - notice calls core.notice", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.notice("notice message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "notice");
});

// =============================================================================
// Group tests
// =============================================================================

Deno.test("ActionsLogger - startGroup calls core.startGroup", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.startGroup("my-group");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "startGroup");
  assertEquals(calls[0].args, ["my-group"]);
});

Deno.test("ActionsLogger - endGroup calls core.endGroup", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.endGroup();

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "endGroup");
});

Deno.test("ActionsLogger - group wraps async function", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  const result = await logger.group("test-group", () => Promise.resolve(42));

  assertEquals(result, 42);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "group");
  assertEquals(calls[0].args, ["test-group"]);
});

// =============================================================================
// setFailed tests
// =============================================================================

Deno.test("ActionsLogger - setFailed calls core.setFailed with string", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.setFailed("failure message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "setFailed");
  assertEquals(calls[0].args, ["failure message"]);
});

Deno.test("ActionsLogger - setFailed calls core.setFailed with Error", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);
  const error = new Error("error object");

  logger.setFailed(error);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "setFailed");
  assertEquals(calls[0].args[0], error);
});

// =============================================================================
// success/skip tests
// =============================================================================

Deno.test("ActionsLogger - success uses core.info", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.success("success message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "info");
  assertEquals(calls[0].args, ["success message"]);
});

Deno.test("ActionsLogger - skip uses core.debug", () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  logger.skip("skip message");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "debug");
  assertEquals(calls[0].args, ["skip message"]);
});

// =============================================================================
// writeSummary tests
// =============================================================================

function createSyncResult(
  overrides: Partial<SyncResult> = {},
): SyncResult {
  return {
    success: true,
    summary: {
      created: 0,
      updated: 0,
      renamed: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
    },
    operations: [],
    ...overrides,
  };
}

Deno.test("writeSummary - writes heading with success emoji", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
    }),
  );

  const headingCall = calls.find((c) => c.method === "summary.addHeading");
  assertStringIncludes(headingCall?.args[0] as string, ":white_check_mark:");
});

Deno.test("writeSummary - writes heading with failure emoji", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      success: false,
      summary: {
        created: 0,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 1,
      },
    }),
  );

  const headingCall = calls.find((c) => c.method === "summary.addHeading");
  assertStringIncludes(headingCall?.args[0] as string, ":x:");
});

Deno.test("writeSummary - adds counts table", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 2,
        updated: 1,
        renamed: 3,
        deleted: 0,
        skipped: 5,
        failed: 0,
      },
    }),
  );

  const tableCall = calls.find((c) => c.method === "summary.addTable");
  const rows = tableCall?.args[0] as unknown[][];

  // First row is headers (objects with { data, header } shape)
  const headers = rows[0] as Array<{ data: string; header: boolean }>;
  assertEquals(headers.length, 5);

  // Build header index mapping for robust assertions
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => (headerIndex[h.data] = i));

  // Verify all expected headers exist
  const expectedHeaders = [
    "Created",
    "Updated",
    "Renamed",
    "Deleted",
    "Failed",
  ];
  for (const h of expectedHeaders) {
    assertEquals(headerIndex[h] !== undefined, true, `Missing header: ${h}`);
  }

  // Assert counts by header name (order-independent)
  const counts = rows[1];
  assertEquals(counts[headerIndex["Created"]], "2");
  assertEquals(counts[headerIndex["Updated"]], "1");
  assertEquals(counts[headerIndex["Renamed"]], "3");
  assertEquals(counts[headerIndex["Deleted"]], "0");
  assertEquals(counts[headerIndex["Failed"]], "0");
});

Deno.test("writeSummary - adds raw table for < 5 operations", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  const operations: SyncOperation[] = [
    {
      type: "create",
      label: "bug",
      success: true,
      details: { color: "d73a4a", description: "Bug report" },
    },
    { type: "delete", label: "old", success: true },
  ];

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 1,
        skipped: 0,
        failed: 0,
      },
      operations,
    }),
  );

  // Should have two table calls: one for counts, one for operations
  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  assertEquals(tableCalls.length, 2);

  const operationsTable = tableCalls[1].args[0] as unknown[][];
  assertEquals(operationsTable.length, 3); // Headers + 2 rows
  assertEquals(operationsTable[1][0], "bug");
  assertEquals(operationsTable[2][0], "old");
});

Deno.test("writeSummary - adds collapsed table for >= 5 operations", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  const operations: SyncOperation[] = Array.from({ length: 5 }, (_, i) => ({
    type: "create" as const,
    label: `label-${i}`,
    success: true,
  }));

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 5,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations,
    }),
  );

  // Should have raw calls for details tags
  const rawCalls = calls.filter((c) => c.method === "summary.addRaw");
  const detailsStart = rawCalls.find((c) =>
    (c.args[0] as string).includes("<details>")
  );
  const detailsEnd = rawCalls.find((c) =>
    (c.args[0] as string).includes("</details>")
  );

  assertEquals(
    detailsStart !== undefined,
    true,
    "should start details with header",
  );
  assertStringIncludes(
    detailsStart!.args[0] as string,
    "<details><summary>Operation Details</summary>\n\n",
  );

  assertEquals(detailsEnd !== undefined, true, "should end details");
  assertStringIncludes(detailsEnd!.args[0] as string, "\n</details>");

  // Should have operation table
  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  assertEquals(tableCalls.length, 2);
  assertEquals((tableCalls[1].args[0] as unknown[][]).length, 6); // Headers + 5 rows
});

Deno.test("writeSummary - adds failed operations list", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  const operations: SyncOperation[] = [
    { type: "create", label: "bug", success: false, error: "API error" },
    { type: "delete", label: "old", success: false, error: "Not found" },
  ];

  await logger.writeSummary(
    createSyncResult({
      success: false,
      summary: {
        created: 0,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 2,
      },
      operations,
    }),
  );

  const listCall = calls.find((c) => c.method === "summary.addList");
  assertEquals(listCall !== undefined, true, "should call addList");

  const items = listCall?.args[0] as string[];
  assertEquals(items.length, 2);
  assertStringIncludes(items[0], "bug");
  assertStringIncludes(items[0], "API error");
});

Deno.test("writeSummary - writes 'all in sync' message when only skips", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 0,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 5,
        failed: 0,
      },
      operations: [
        { type: "skip", label: "bug", success: true },
      ],
    }),
  );

  const writeCall = calls.find((c) => c.method === "summary.write");
  assertEquals(
    writeCall !== undefined,
    true,
    "should call write for skip-only",
  );

  const rawCall = calls.find((c) =>
    c.method === "summary.addRaw" &&
    (c.args[0] as string).includes("5 label(s) already in sync")
  );
  assertStringIncludes(
    rawCall?.args[0] as string,
    "5 label(s) already in sync",
  );
});

Deno.test("writeSummary - does not write if empty config (no labels)", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 0,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [],
    }),
  );

  const writeCall = calls.find((c) => c.method === "summary.write");
  assertEquals(writeCall, undefined, "should not write for empty run");
});

Deno.test("writeSummary - writes when there are changes", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        { type: "create", label: "bug", success: true },
      ],
    }),
  );

  const writeCall = calls.find((c) => c.method === "summary.write");
  assertEquals(writeCall !== undefined, true, "should call write");
});

// =============================================================================
// formatOperationsTable tests (via writeSummary)
// =============================================================================

Deno.test("writeSummary - formats create operation", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        {
          type: "create",
          label: "bug",
          success: true,
          details: { color: "d73a4a", description: "Bug report" },
        },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  assertEquals(row[0], "bug");
  assertStringIncludes(row[1], "🆕 Created");
  assertStringIncludes(row[2], "background-color:#d73a4a");
  assertStringIncludes(row[3], "Bug report");
});

Deno.test("writeSummary - formats update operation", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 0,
        updated: 1,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        { type: "update", label: "feature", success: true },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  assertStringIncludes(row[1], "✏️ Updated");
});

Deno.test("writeSummary - formats rename operation with from", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 0,
        updated: 0,
        renamed: 1,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        {
          type: "rename",
          label: "enhancement",
          from: "feature",
          success: true,
        },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  assertStringIncludes(
    row[1],
    '🔄 Renamed from "feature"',
  );
});

Deno.test("writeSummary - formats delete operation", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 0,
        updated: 0,
        renamed: 0,
        deleted: 1,
        skipped: 0,
        failed: 0,
      },
      operations: [
        { type: "delete", label: "old-label", success: true },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  assertStringIncludes(row[1], "🗑️ Deleted");
});

Deno.test("writeSummary - truncates long descriptions", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  const longDesc = "A".repeat(100);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        {
          type: "create",
          label: "test",
          success: true,
          details: { description: longDesc },
        },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  // Should be truncated to 47 chars + "..."
  assertEquals(row[3].includes("A".repeat(100)), false);
  assertEquals(row[3].includes("A".repeat(47)), true);
  assertEquals(row[3].endsWith("..."), true);
  assertEquals(row[3].length, 50); // 47 + "..." = 50
});

Deno.test("writeSummary - handles missing color in operation", async () => {
  const { core, calls } = createMockCore();
  const logger = new ActionsLogger(core);

  await logger.writeSummary(
    createSyncResult({
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [
        { type: "create", label: "test", success: true },
      ],
    }),
  );

  const tableCalls = calls.filter((c) => c.method === "summary.addTable");
  const opsTable = tableCalls[1].args[0] as unknown[][];
  const row = opsTable[1] as string[];

  // Should have empty color column
  assertEquals(row[0], "test");
  assertEquals(row[2], "");
});
