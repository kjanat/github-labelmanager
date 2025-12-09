/**
 * Tests for main.ts CLI entry point
 *
 * Tests error handling paths via MockLogger injection.
 * Happy paths are covered by sync_test.ts unit tests.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { main } from "github-labelmanager";
import { MockLogger, stubArgs, stubEnv } from "~/testing.ts";

// =============================================================================
// Missing token tests
// =============================================================================

Deno.test("main - fails when GITHUB_TOKEN is missing", async () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: undefined });
  const restoreArgs = stubArgs(["owner/repo"]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "GITHUB_TOKEN");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// =============================================================================
// Missing repository tests
// =============================================================================

Deno.test("main - fails when repository argument is missing", async () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", REPO: undefined });
  const restoreArgs = stubArgs([]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Repository");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// =============================================================================
// Invalid repository format tests
// =============================================================================

Deno.test("main - fails when repository format is invalid", async () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["invalid-repo-format"]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Invalid repository format");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("main - fails when repository has empty owner", async () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["/repo"]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Invalid repository format");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// =============================================================================
// Config file not found tests
// =============================================================================

Deno.test("main - fails when config file not found", async () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/repo", "--config", "nonexistent.yml"]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Config file not found");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// =============================================================================
// Invalid YAML tests
// =============================================================================

Deno.test("main - fails when config has invalid YAML", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "invalid: yaml: content: [");

  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/repo", "--config", tempFile]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "YAML parse error");
  } finally {
    restoreArgs();
    restoreEnv();
    await Deno.remove(tempFile);
  }
});

// =============================================================================
// Invalid schema tests
// =============================================================================

Deno.test("main - fails when config has invalid schema", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "wrong: schema\nno_labels: true");

  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/repo", "--config", tempFile]);
  const logger = new MockLogger();

  try {
    await main(logger);

    assertEquals(logger.failedMessages.length, 1);
    assertStringIncludes(logger.failedMessages[0], "Invalid");
  } finally {
    restoreArgs();
    restoreEnv();
    await Deno.remove(tempFile);
  }
});
