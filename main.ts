#!/usr/bin/env -S deno run --allow-net=api.github.com --allow-read --allow-env

/**
 * CLI entrypoint for github-labelmanager
 * @module
 */

import {
  ConfigError,
  getEnv,
  type GetEnvOptions,
  loadConfig,
  printHelp,
} from "~/config.ts";
import { LabelManager } from "~/client.ts";
import { syncLabels } from "~/sync.ts";
import { createLogger } from "~/factory.ts";
import type { ILogger } from "~/adapters/logger/mod.ts";

/** Options for main() to enable testing without global state mutation */
export interface MainOptions {
  /** Logger instance (uses environment-appropriate logger if not provided) */
  logger?: ILogger;
  /** Options for getEnv (allows explicit args/env for testing) */
  envOptions?: GetEnvOptions;
}

/**
 * Main entry point for the CLI
 *
 * @param options - Optional configuration for testing
 */
export async function main(options?: MainOptions): Promise<void> {
  // Create logger first so we can report errors
  const log = options?.logger ?? createLogger();

  try {
    const env = getEnv(options?.envOptions);
    const config = await loadConfig(env.configPath);
    const manager = new LabelManager(env, { logger: log });
    const result = await syncLabels(manager, config);

    // Print summary
    const { summary } = result;
    log.info(
      `Summary: ${summary.created} created, ${summary.updated} updated, ` +
        `${summary.renamed} renamed, ${summary.deleted} deleted, ` +
        `${summary.skipped} skipped, ${summary.failed} failed`,
    );

    // Write step summary (for Actions - no-op in CLI)
    await log.writeSummary(result);

    // Exit with error if any operations failed
    if (!result.success) {
      log.setFailed("One or more operations failed");
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      log.setFailed(err.message);
      if (err.showHelp) {
        printHelp();
      }
      return;
    }

    if (err instanceof Deno.errors.NotFound) {
      log.setFailed(err.message);
      return;
    }

    if (err instanceof Deno.errors.InvalidData) {
      log.setFailed(err.message);
      return;
    }

    // Unknown error - rethrow
    throw err;
  }
}

// Handle errors gracefully
if (import.meta.main) {
  main().catch((err) => {
    // Unknown error - show full stack
    console.error(err);
    Deno.exit(1);
  });
}
