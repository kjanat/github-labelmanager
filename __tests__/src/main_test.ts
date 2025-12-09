/**
 * Tests for main.ts CLI entry point
 *
 * Tests error handling paths via MockLogger injection and explicit env options.
 * Happy paths are covered by sync_test.ts unit tests.
 *
 * Note: Tests use explicit args/envGet options to avoid global state mutation,
 * allowing safe parallel test execution.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { main } from "github-labelmanager";
import { createEnvGet, MockLogger } from "~/testing/mod.ts";

// =============================================================================
// Missing token tests
// =============================================================================

Deno.test("main - fails when GITHUB_TOKEN is missing", async () => {
  const logger = new MockLogger();

  await main({
    logger,
    envOptions: {
      args: ["owner/repo"],
      envGet: createEnvGet({ GITHUB_TOKEN: undefined }),
    },
  });

  assertEquals(logger.failedMessages.length, 1);
  assertStringIncludes(logger.failedMessages[0], "GITHUB_TOKEN");
});

// =============================================================================
// Missing repository tests
// =============================================================================

Deno.test("main - fails when repository argument is missing", async () => {
  const logger = new MockLogger();

  await main({
    logger,
    envOptions: {
      args: [],
      envGet: createEnvGet({ GITHUB_TOKEN: "token", REPO: undefined }),
    },
  });

  assertEquals(logger.failedMessages.length, 1);
  assertStringIncludes(logger.failedMessages[0], "Repository");
});

// =============================================================================
// Invalid repository format tests
// =============================================================================

Deno.test("main - fails when repository format is invalid", async () => {
  const logger = new MockLogger();

  await main({
    logger,
    envOptions: {
      args: ["invalid-repo-format"],
      envGet: createEnvGet({ GITHUB_TOKEN: "token" }),
    },
  });

  assertEquals(logger.failedMessages.length, 1);
  assertStringIncludes(logger.failedMessages[0], "Invalid repository format");
});

Deno.test("main - fails when repository has empty owner", async () => {
  const logger = new MockLogger();

  await main({
    logger,
    envOptions: {
      args: ["/repo"],
      envGet: createEnvGet({ GITHUB_TOKEN: "token" }),
    },
  });

  assertEquals(logger.failedMessages.length, 1);
  assertStringIncludes(logger.failedMessages[0], "Invalid repository format");
});

// =============================================================================
// Config file not found tests
// =============================================================================

Deno.test("main - fails when config file not found", async () => {
  const logger = new MockLogger();

  await main({
    logger,
    envOptions: {
      args: ["owner/repo", "--config", "nonexistent.yml"],
      envGet: createEnvGet({ GITHUB_TOKEN: "token" }),
    },
  });

  assertEquals(logger.failedMessages.length, 1);
  assertStringIncludes(logger.failedMessages[0], "Config file not found");
});

// =============================================================================
// Invalid YAML tests
// =============================================================================

Deno.test("main - fails when config has invalid YAML", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "invalid: yaml: content: [");

  const logger = new MockLogger();

  try {
    await main({
      logger,
      envOptions: {
        args: ["owner/repo", "--config", tempFile],
        envGet: createEnvGet({ GITHUB_TOKEN: "token" }),
      },
    });

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "YAML parse error");
  } finally {
    await Deno.remove(tempFile);
  }
});

// =============================================================================
// Invalid schema tests
// =============================================================================

Deno.test("main - fails when config has invalid schema", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "wrong: schema\nno_labels: true");

  const logger = new MockLogger();

  try {
    await main({
      logger,
      envOptions: {
        args: ["owner/repo", "--config", tempFile],
        envGet: createEnvGet({ GITHUB_TOKEN: "token" }),
      },
    });

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Invalid");
  } finally {
    await Deno.remove(tempFile);
  }
});
