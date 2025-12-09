/**
 * Tests for BaseGitHubClient
 */

import { assertEquals, assertRejects } from "@std/assert";
import { BaseGitHubClient } from "~/adapters/client/base.ts";
import type {
  GitHubClientConfig,
  GitHubLabel,
} from "~/adapters/client/types.ts";
import {
  createMockOctokit as createSharedMockOctokit,
  NullLogger,
} from "~/testing.ts";

// =============================================================================
// Mock Octokit Wrapper
// =============================================================================

/** Call record format used by tests */
interface MockOctokitCall {
  method: string;
  args: unknown;
}

/** Options using method-based error keys for convenience */
interface MockOctokitOptions {
  labels?: GitHubLabel[];
  errors?: {
    getLabel?: Error;
    createLabel?: Error;
    updateLabel?: Error;
    deleteLabel?: Error;
  };
}

// deno-lint-ignore no-explicit-any
type MockOctokit = any;

/** Maps method names to route strings */
const methodToRoute: Record<string, string> = {
  getLabel: "GET /repos/{owner}/{repo}/labels/{name}",
  createLabel: "POST /repos/{owner}/{repo}/labels",
  updateLabel: "PATCH /repos/{owner}/{repo}/labels/{name}",
  deleteLabel: "DELETE /repos/{owner}/{repo}/labels/{name}",
};

/** Maps route strings to method names - derived from methodToRoute */
const routeToMethod: Record<string, string> = Object.fromEntries(
  Object.entries(methodToRoute).map(([method, route]) => [route, method]),
);

/**
 * Wrapper around shared createMockOctokit that provides method-based interface.
 * Uses the shared helper from ~/testing.ts but adapts the API for these tests.
 *
 * Note: `calls` is a live array that updates as requests are made.
 * This is achieved by using a Proxy to intercept array access.
 */
function createMockOctokit(options: MockOctokitOptions = {}): {
  octokit: MockOctokit;
  calls: MockOctokitCall[];
} {
  // Convert method-based errors to route-based errors
  const routeErrors: Record<string, Error> = {};
  if (options.errors) {
    for (const [method, error] of Object.entries(options.errors)) {
      const route = methodToRoute[method];
      if (route && error) {
        routeErrors[route] = error;
      }
    }
  }

  const { octokit, requests } = createSharedMockOctokit({
    labels: options.labels,
    errors: routeErrors,
  });

  // Use a Proxy to provide live access to mapped calls
  // This allows destructuring `{ calls }` while still getting updated values
  const calls = new Proxy([] as MockOctokitCall[], {
    get(_, prop) {
      const mapped = requests.map((r) => ({
        method: routeToMethod[r.route] ?? r.route,
        args: r.params,
      }));
      return Reflect.get(mapped, prop);
    },
  });

  return { octokit, calls };
}

// =============================================================================
// Testable BaseGitHubClient
// =============================================================================

class TestableBaseClient extends BaseGitHubClient {
  protected readonly octokit: MockOctokit;

  constructor(
    config: GitHubClientConfig,
    octokit: MockOctokit,
  ) {
    super(config, new NullLogger());
    this.octokit = octokit;
  }

  // Abstract method implementation for testing
  list(): Promise<GitHubLabel[]> {
    return Promise.resolve([]);
  }

  // Expose protected method for testing
  testIsNotFoundError(err: unknown): boolean {
    return this.isNotFoundError(err);
  }
}

// =============================================================================
// Constructor tests
// =============================================================================

Deno.test("BaseGitHubClient - stores owner from config", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "test-owner", repo: "test-repo", dryRun: false },
    octokit,
  );

  assertEquals(client.owner, "test-owner");
});

Deno.test("BaseGitHubClient - stores repo from config", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "test-owner", repo: "test-repo", dryRun: false },
    octokit,
  );

  assertEquals(client.repo, "test-repo");
});

Deno.test("BaseGitHubClient - stores isDryRun from config", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: true },
    octokit,
  );

  assertEquals(client.isDryRun, true);
});

// =============================================================================
// get() tests
// =============================================================================

Deno.test("get - returns label when found", async () => {
  const { octokit } = createMockOctokit({
    labels: [{ name: "bug", color: "d73a4a", description: "Bug report" }],
  });
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const result = await client.get("bug");

  assertEquals(result, {
    name: "bug",
    color: "d73a4a",
    description: "Bug report",
  });
});

Deno.test("get - returns null when label not found (404)", async () => {
  const { octokit } = createMockOctokit({ labels: [] });
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const result = await client.get("nonexistent");

  assertEquals(result, null);
});

Deno.test("get - throws on non-404 error", async () => {
  const { octokit } = createMockOctokit({
    errors: { getLabel: new Error("Server error") },
  });
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  await assertRejects(
    () => client.get("bug"),
    Error,
    "Server error",
  );
});

Deno.test("get - passes correct owner/repo/name to API", async () => {
  const { octokit, calls } = createMockOctokit({
    labels: [{ name: "bug", color: "d73a4a", description: null }],
  });
  const client = new TestableBaseClient(
    { token: "test", owner: "my-org", repo: "my-repo", dryRun: false },
    octokit,
  );

  await client.get("bug");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].args, {
    owner: "my-org",
    repo: "my-repo",
    name: "bug",
  });
});

// =============================================================================
// create() tests
// =============================================================================

Deno.test("create - creates label and returns result", async () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const result = await client.create({
    name: "bug",
    color: "#d73a4a",
    description: "Bug report",
  });

  assertEquals(result, {
    name: "bug",
    color: "d73a4a",
    description: "Bug report",
  });
});

Deno.test("create - strips # from color", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  await client.create({ name: "test", color: "#ff0000", description: "Test" });

  const createCall = calls.find((c) => c.method === "createLabel");
  assertEquals((createCall?.args as { color: string }).color, "ff0000");
});

Deno.test("create - returns null in dry-run mode", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: true },
    octokit,
  );

  const result = await client.create({
    name: "bug",
    color: "d73a4a",
    description: "Bug",
  });

  assertEquals(result, null);
  assertEquals(calls.length, 0); // No API call made
});

Deno.test("create - passes correct params to API", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "my-org", repo: "my-repo", dryRun: false },
    octokit,
  );

  await client.create({
    name: "feature",
    color: "a2eeef",
    description: "New feature",
  });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].args, {
    owner: "my-org",
    repo: "my-repo",
    name: "feature",
    color: "a2eeef",
    description: "New feature",
  });
});

// =============================================================================
// update() tests
// =============================================================================

Deno.test("update - updates label without rename when new_name not provided", async () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const result = await client.update("old-name", {
    name: "new-name",
    color: "ff0000",
    description: "Updated",
  });

  assertEquals(result?.name, "old-name"); // new_name wasn't passed
  assertEquals(result?.color, "ff0000");
});

Deno.test("update - renames label when new_name provided", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const result = await client.update("old-name", {
    name: "old-name",
    new_name: "new-name",
    color: "ff0000",
    description: "Renamed",
  });

  assertEquals(result?.name, "new-name");
  const updateCall = calls.find((c) => c.method === "updateLabel");
  assertEquals((updateCall?.args as { new_name: string }).new_name, "new-name");
});

Deno.test("update - strips # from color", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  await client.update("test", {
    name: "test",
    color: "#aabbcc",
    description: "Test",
  });

  const updateCall = calls.find((c) => c.method === "updateLabel");
  assertEquals((updateCall?.args as { color: string }).color, "aabbcc");
});

Deno.test("update - returns null in dry-run mode", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: true },
    octokit,
  );

  const result = await client.update("bug", {
    name: "bug",
    color: "d73a4a",
    description: "Bug",
  });

  assertEquals(result, null);
  assertEquals(calls.length, 0);
});

Deno.test("update - skips API call for rename in dry-run mode", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: true },
    octokit,
  );

  const result = await client.update("old", {
    name: "old",
    new_name: "new",
    color: "ff0000",
  });

  assertEquals(result, null);
  assertEquals(calls.length, 0);
});

// =============================================================================
// delete() tests
// =============================================================================

Deno.test("delete - deletes label", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "my-org", repo: "my-repo", dryRun: false },
    octokit,
  );

  await client.delete("old-label");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "deleteLabel");
  assertEquals(calls[0].args, {
    owner: "my-org",
    repo: "my-repo",
    name: "old-label",
  });
});

Deno.test("delete - does nothing in dry-run mode", async () => {
  const { octokit, calls } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: true },
    octokit,
  );

  await client.delete("old-label");

  assertEquals(calls.length, 0);
});

Deno.test("delete - throws on error", async () => {
  const { octokit } = createMockOctokit({
    errors: { deleteLabel: new Error("Delete failed") },
  });
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  await assertRejects(
    () => client.delete("bug"),
    Error,
    "Delete failed",
  );
});

// =============================================================================
// isNotFoundError() tests
// =============================================================================

Deno.test("isNotFoundError - returns true for 404 status", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  const error = { status: 404, message: "Not Found" };
  assertEquals(client.testIsNotFoundError(error), true);
});

Deno.test("isNotFoundError - returns false for other status", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  assertEquals(client.testIsNotFoundError({ status: 500 }), false);
  assertEquals(client.testIsNotFoundError({ status: 403 }), false);
  assertEquals(client.testIsNotFoundError({ status: 200 }), false);
});

Deno.test("isNotFoundError - returns false for non-object", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  assertEquals(client.testIsNotFoundError(null), false);
  assertEquals(client.testIsNotFoundError(undefined), false);
  assertEquals(client.testIsNotFoundError("error"), false);
  assertEquals(client.testIsNotFoundError(404), false);
});

Deno.test("isNotFoundError - returns false for object without status", () => {
  const { octokit } = createMockOctokit();
  const client = new TestableBaseClient(
    { token: "test", owner: "owner", repo: "repo", dryRun: false },
    octokit,
  );

  assertEquals(client.testIsNotFoundError({ message: "error" }), false);
  assertEquals(client.testIsNotFoundError({}), false);
});
