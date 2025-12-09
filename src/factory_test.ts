/**
 * Tests for factory functions
 */

import { assertEquals } from "@std/assert";
import {
  createGitHubClient,
  createLogger,
  createServices,
  isGitHubActions,
} from "./factory.ts";
import { ActionsLogger, ConsoleLogger } from "./adapters/logger/mod.ts";
import { ActionsGitHubClient } from "./adapters/client/mod.ts";
import { stubEnv } from "./testing.ts";

// =============================================================================
// isGitHubActions tests
// =============================================================================

Deno.test("isGitHubActions - returns true when GITHUB_ACTIONS=true", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "true" });
  try {
    assertEquals(isGitHubActions(), true);
  } finally {
    restore();
  }
});

Deno.test("isGitHubActions - returns false when GITHUB_ACTIONS not set", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: undefined });
  try {
    assertEquals(isGitHubActions(), false);
  } finally {
    restore();
  }
});

Deno.test("isGitHubActions - returns false when GITHUB_ACTIONS=false", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "false" });
  try {
    assertEquals(isGitHubActions(), false);
  } finally {
    restore();
  }
});

Deno.test("isGitHubActions - returns false when GITHUB_ACTIONS is other value", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "1" });
  try {
    assertEquals(isGitHubActions(), false);
  } finally {
    restore();
  }
});

// =============================================================================
// createLogger tests
// =============================================================================

Deno.test("createLogger - returns ConsoleLogger when not in GitHub Actions", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: undefined });
  try {
    const logger = createLogger();
    assertEquals(logger instanceof ConsoleLogger, true);
  } finally {
    restore();
  }
});

Deno.test("createLogger - returns ActionsLogger when in GitHub Actions", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "true" });
  try {
    const logger = createLogger();
    assertEquals(logger instanceof ActionsLogger, true);
  } finally {
    restore();
  }
});

// =============================================================================
// createGitHubClient tests
// =============================================================================

// Note: We don't test OctokitClient creation via factory because it creates
// real Octokit with throttling intervals that leak. OctokitClient is tested
// directly in octokit_test.ts with mock Octokit injection.
// This test just verifies the factory returns the correct type in Actions env.

Deno.test("createGitHubClient - returns ActionsGitHubClient when in GitHub Actions", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "true" });
  try {
    const logger = new ActionsLogger();
    const client = createGitHubClient(
      { token: "test", owner: "owner", repo: "repo", dryRun: false },
      logger,
    );
    assertEquals(client instanceof ActionsGitHubClient, true);
  } finally {
    restore();
  }
});

// =============================================================================
// createServices tests
// =============================================================================

Deno.test("createServices - returns ActionsLogger and ActionsGitHubClient when in Actions", () => {
  const restore = stubEnv({ GITHUB_ACTIONS: "true" });
  try {
    const { logger, client } = createServices({
      token: "test",
      owner: "owner",
      repo: "repo",
      dryRun: false,
    });
    assertEquals(logger instanceof ActionsLogger, true);
    assertEquals(client instanceof ActionsGitHubClient, true);
  } finally {
    restore();
  }
});
