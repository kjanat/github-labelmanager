/**
 * Tests for syncLabels
 * @module
 */

import { assertEquals } from "@std/assert";
import { syncLabels } from "~/sync.ts";
import { LabelManager } from "~/client.ts";
import { createTestEnv, MockGitHubClient, NullLogger } from "~/testing.ts";
import { label, LabelNameUtils } from "~/labels-model.ts";
import type { LabelConfig } from "~/types.ts";

/** Helper to create a LabelManager with mock client */
function createTestManager(
  client: MockGitHubClient,
): LabelManager {
  const env = createTestEnv({
    owner: client.owner,
    repo: client.repo,
    dryRun: client.isDryRun,
  });
  return new LabelManager(env, { client, logger: new NullLogger() });
}

// =============================================================================
// Create tests
// =============================================================================

Deno.test("syncLabels - creates new label when not in repo", async () => {
  const client = new MockGitHubClient({ labels: [] });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug report").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.created, 1);
  assertEquals(client.wasCalled("create"), true);
  assertEquals(client.labels.length, 1);
  assertEquals(client.labels[0].name, "bug");
});

// =============================================================================
// Skip tests
// =============================================================================

Deno.test("syncLabels - skips unchanged label", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "d73a4a", description: "Bug report" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug report").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.skipped, 1);
  assertEquals(client.wasCalled("create"), false);
  assertEquals(client.wasCalled("update"), false);
});

// =============================================================================
// Update tests
// =============================================================================

Deno.test("syncLabels - updates label when color differs", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "000000", description: "Bug report" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug report").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.updated, 1);
  assertEquals(client.wasCalled("update"), true);
  assertEquals(client.labels[0].color, "d73a4a");
});

Deno.test("syncLabels - updates label when description differs", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "d73a4a", description: "Old description" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [
      label("bug").color("d73a4a").description("New description").build(),
    ],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.updated, 1);
  assertEquals(client.labels[0].description, "New description");
});

// =============================================================================
// Rename tests
// =============================================================================

Deno.test("syncLabels - renames label via alias", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "enhancement", color: "a2eeef", description: "Feature" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [
      label("feature")
        .color("a2eeef")
        .description("Feature")
        .aliases("enhancement")
        .build(),
    ],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.renamed, 1);
  assertEquals(client.labels[0].name, "feature");
  assertEquals(
    result.operations.find((o) => o.type === "rename")?.from,
    "enhancement",
  );
});

Deno.test("syncLabels - uses first matching alias", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "alias2", color: "a2eeef", description: "Feature" }],
  });
  const manager = createTestManager(client);
  const config: LabelConfig = {
    labels: [
      label("feature")
        .color("a2eeef")
        .description("Feature")
        .aliases("alias1", "alias2", "alias3")
        .build(),
    ],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.renamed, 1);
  // Should rename from alias2 (first one found in repo)
  assertEquals(
    result.operations.find((o) => o.type === "rename")?.from,
    "alias2",
  );
});

Deno.test("syncLabels - rename with color and description change updates all in single operation", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "old-name", color: "000000", description: "Old desc" }],
  });
  const manager = createTestManager(client);
  const config: LabelConfig = {
    labels: [
      label("new-name")
        .color("ff0000")
        .description("New description")
        .aliases("old-name")
        .build(),
    ],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.renamed, 1);
  assertEquals(result.summary.updated, 0); // No separate update - rename includes color/description
  assertEquals(result.summary.skipped, 0); // Rename is complete, no skip counted

  // Verify the label was fully updated via the rename call
  assertEquals(client.labels[0].name, "new-name");
  assertEquals(client.labels[0].color, "ff0000");
  assertEquals(client.labels[0].description, "New description");

  // Verify only one update call was made (the rename)
  assertEquals(client.getCalls("update").length, 1);
});

// =============================================================================
// Delete tests
// =============================================================================

Deno.test("syncLabels - deletes existing label", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "obsolete", color: "000000", description: "Old" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [],
    delete: [LabelNameUtils.parse("obsolete")],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.deleted, 1);
  assertEquals(client.wasCalled("delete"), true);
  assertEquals(client.labels.length, 0);
});

Deno.test("syncLabels - skips delete for non-existent label", async () => {
  const client = new MockGitHubClient({ labels: [] });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [],
    delete: [LabelNameUtils.parse("missing")],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.skipped, 1);
  assertEquals(client.wasCalled("delete"), false);
});

// =============================================================================
// Error handling tests
// =============================================================================

Deno.test("syncLabels - returns failure when list() throws", async () => {
  const client = new MockGitHubClient({ labels: [] });
  client.errors.list = new Error("API error");
  const manager = createTestManager(client);

  const config: LabelConfig = { labels: [] };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, false);
  assertEquals(result.summary.failed, 1);
});

Deno.test("syncLabels - tracks failed create in summary", async () => {
  const client = new MockGitHubClient({ labels: [] });
  client.errors.create = new Error("Create failed");
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, false);
  assertEquals(result.summary.failed, 1);
  assertEquals(result.summary.created, 0);
  const op = result.operations.find((o) => o.type === "create");
  assertEquals(op?.success, false);
  assertEquals(op?.error?.includes("Create failed"), true);
});

Deno.test("syncLabels - tracks failed update in summary", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "000000", description: "Bug" }],
  });
  client.errors.update = new Error("Update failed");
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, false);
  assertEquals(result.summary.failed, 1);
  assertEquals(result.summary.updated, 0);
});

Deno.test("syncLabels - tracks failed delete in summary", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "obsolete", color: "000000", description: "Old" }],
  });
  client.errors.delete = new Error("Delete failed");
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [],
    delete: [LabelNameUtils.parse("obsolete")],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, false);
  assertEquals(result.summary.failed, 1);
  assertEquals(result.summary.deleted, 0);
});

Deno.test("syncLabels - skips create after failed rename", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "old-name", color: "a2eeef", description: "Feature" }],
  });
  client.errors.update = new Error("Rename failed");
  const manager = createTestManager(client);

  const config: LabelConfig = {
    labels: [
      label("new-name")
        .color("a2eeef")
        .description("Feature")
        .aliases("old-name")
        .build(),
    ],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, false);
  assertEquals(result.summary.failed, 1);
  assertEquals(result.summary.renamed, 0);
  // Should NOT attempt to create after failed rename
  assertEquals(client.wasCalled("create"), false);
});

// =============================================================================
// Color normalization tests
// =============================================================================

Deno.test("syncLabels - normalizes color with # prefix", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "d73a4a", description: "Bug" }],
  });
  const manager = createTestManager(client);

  // Config has # prefix, repo doesn't - should still match after stripping #
  const config: LabelConfig = {
    // deno-lint-ignore no-explicit-any
    labels: [label("bug").color("#d73a4a" as any).description("Bug").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.skipped, 1); // Should skip, not update
});

Deno.test("syncLabels - normalizes color case", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "D73A4A", description: "Bug" }],
  });
  const manager = createTestManager(client);

  // Config has lowercase, repo has uppercase - should still match
  const config: LabelConfig = {
    labels: [label("bug").color("d73a4a").description("Bug").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.skipped, 1);
});

Deno.test("syncLabels - expands 3-char hex", async () => {
  const client = new MockGitHubClient({
    labels: [{ name: "bug", color: "ffaabb", description: "Bug" }],
  });
  const manager = createTestManager(client);

  const config: LabelConfig = {
    // deno-lint-ignore no-explicit-any
    labels: [label("bug").color("fab" as any).description("Bug").build()],
  };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.summary.skipped, 1);
});

// =============================================================================
// Empty config tests
// =============================================================================

Deno.test("syncLabels - handles empty config (no labels, no deletes)", async () => {
  const client = new MockGitHubClient({ labels: [] });
  const manager = createTestManager(client);
  const config: LabelConfig = { labels: [] };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.operations.length, 0);
  assertEquals(result.summary.created, 0);
  assertEquals(result.summary.updated, 0);
  assertEquals(result.summary.renamed, 0);
  assertEquals(result.summary.deleted, 0);
  assertEquals(result.summary.skipped, 0);
  assertEquals(result.summary.failed, 0);
});

Deno.test("syncLabels - empty config with existing repo labels does nothing", async () => {
  const client = new MockGitHubClient({
    labels: [
      { name: "bug", color: "d73a4a", description: "Bug" },
      { name: "feature", color: "0075ca", description: "Feature" },
    ],
  });
  const manager = createTestManager(client);
  const config: LabelConfig = { labels: [] };

  const result = await syncLabels(manager, config);

  assertEquals(result.success, true);
  assertEquals(result.operations.length, 0);
  // Existing labels should remain untouched
  assertEquals(client.labels.length, 2);
});
