/**
 * Tests for OctokitClient
 */

import { assertEquals } from "@std/assert";
import { OctokitClient } from "~/adapters/client/octokit.ts";
import { createMockOctokit, NullLogger } from "~/testing.ts";
import type { GitHubClientConfig } from "~/adapters/client/types.ts";

const testConfig: GitHubClientConfig = {
  token: "test-token",
  owner: "test-owner",
  repo: "test-repo",
  dryRun: false,
};

// =============================================================================
// Constructor tests
// =============================================================================

Deno.test("OctokitClient - accepts injected Octokit instance", () => {
  const { octokit } = createMockOctokit();
  const logger = new NullLogger();

  // Should not throw - proves DI works
  const client = new OctokitClient(testConfig, logger, octokit);
  assertEquals(client.owner, "test-owner");
  assertEquals(client.repo, "test-repo");
});

// =============================================================================
// list() tests
// =============================================================================

Deno.test("OctokitClient.list - returns labels from paginate", async () => {
  const { octokit, requests } = createMockOctokit({
    labels: [
      { name: "bug", color: "d73a4a", description: "Bug reports" },
      { name: "feature", color: "0075ca", description: null },
    ],
  });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const labels = await client.list();

  assertEquals(labels.length, 2);
  assertEquals(labels[0], {
    name: "bug",
    color: "d73a4a",
    description: "Bug reports",
  });
  assertEquals(labels[1], {
    name: "feature",
    color: "0075ca",
    description: null,
  });

  // Verify correct route called
  assertEquals(requests.length, 1);
  assertEquals(requests[0].route, "GET /repos/{owner}/{repo}/labels");
  assertEquals(requests[0].params?.owner, "test-owner");
  assertEquals(requests[0].params?.repo, "test-repo");
});

Deno.test("OctokitClient.list - returns empty array when no labels", async () => {
  const { octokit } = createMockOctokit({ labels: [] });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const labels = await client.list();

  assertEquals(labels, []);
});

// =============================================================================
// Inherited BaseGitHubClient methods (via mock rest.issues)
// =============================================================================

Deno.test("OctokitClient.get - returns label when found", async () => {
  const { octokit, requests } = createMockOctokit({
    labels: [{ name: "bug", color: "d73a4a", description: "Bug reports" }],
  });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const label = await client.get("bug");

  assertEquals(label, {
    name: "bug",
    color: "d73a4a",
    description: "Bug reports",
  });
  assertEquals(requests[0].route, "GET /repos/{owner}/{repo}/labels/{name}");
});

Deno.test("OctokitClient.get - returns null when not found", async () => {
  const { octokit } = createMockOctokit({ labels: [] });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const label = await client.get("nonexistent");

  assertEquals(label, null);
});

Deno.test("OctokitClient.create - creates label", async () => {
  const { octokit, requests } = createMockOctokit();
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const label = await client.create({
    name: "new-label",
    color: "ff0000",
    description: "New label",
  });

  assertEquals(label?.name, "new-label");
  assertEquals(label?.color, "ff0000");
  assertEquals(requests[0].route, "POST /repos/{owner}/{repo}/labels");
});

Deno.test("OctokitClient.create - dry run returns null", async () => {
  const { octokit, requests } = createMockOctokit();
  const logger = new NullLogger();
  const client = new OctokitClient(
    { ...testConfig, dryRun: true },
    logger,
    octokit,
  );

  const label = await client.create({
    name: "new-label",
    color: "ff0000",
  });

  assertEquals(label, null);
  assertEquals(requests.length, 0); // No API call made
});

Deno.test("OctokitClient.update - updates label", async () => {
  const { octokit, requests } = createMockOctokit({
    labels: [{ name: "old-name", color: "000000", description: null }],
  });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  const label = await client.update("old-name", {
    name: "old-name",
    new_name: "new-name",
    color: "ffffff",
  });

  assertEquals(label?.name, "new-name");
  assertEquals(label?.color, "ffffff");
  assertEquals(requests[0].route, "PATCH /repos/{owner}/{repo}/labels/{name}");
});

Deno.test("OctokitClient.update - dry run returns null", async () => {
  const { octokit, requests } = createMockOctokit();
  const logger = new NullLogger();
  const client = new OctokitClient(
    { ...testConfig, dryRun: true },
    logger,
    octokit,
  );

  const label = await client.update("old-name", {
    name: "old-name",
    new_name: "new-name",
    color: "ffffff",
  });

  assertEquals(label, null);
  assertEquals(requests.length, 0); // No PATCH call made
});

Deno.test("OctokitClient.delete - deletes label", async () => {
  const { octokit, requests } = createMockOctokit({
    labels: [{ name: "to-delete", color: "000000", description: null }],
  });
  const logger = new NullLogger();
  const client = new OctokitClient(testConfig, logger, octokit);

  await client.delete("to-delete");

  assertEquals(requests[0].route, "DELETE /repos/{owner}/{repo}/labels/{name}");
});

Deno.test("OctokitClient.delete - dry run skips API call", async () => {
  const { octokit, requests } = createMockOctokit();
  const logger = new NullLogger();
  const client = new OctokitClient(
    { ...testConfig, dryRun: true },
    logger,
    octokit,
  );

  await client.delete("some-label");

  assertEquals(requests.length, 0);
});
