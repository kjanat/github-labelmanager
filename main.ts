#!/usr/bin/env -S deno run --allow-net=api.github.com --allow-read --allow-env

/**
 * CLI entrypoint for github-labelmanager
 * @module
 */

import { ConfigError, getEnv, loadConfig, printHelp } from "./src/config.ts";
import { LabelManager } from "./src/client.ts";
import { syncLabels } from "./src/sync.ts";
import { logger } from "./src/logger.ts";

async function main(): Promise<void> {
  const env = getEnv();
  const config = await loadConfig(env.configPath);
  const manager = new LabelManager(env);
  const result = await syncLabels(manager, config);

  // Print summary
  const { summary } = result;
  logger.info(
    `Summary: ${summary.created} created, ${summary.updated} updated, ` +
      `${summary.renamed} renamed, ${summary.deleted} deleted, ` +
      `${summary.skipped} skipped, ${summary.failed} failed`,
  );

  // Exit with error if any operations failed
  if (!result.success) {
    Deno.exit(1);
  }
}

// Handle errors gracefully
if (import.meta.main) {
  main().catch((err) => {
    if (err instanceof ConfigError) {
      console.error(`Error: ${err.message}`);
      if (err.showHelp) {
        printHelp();
      }
      Deno.exit(1);
    }

    if (err instanceof Deno.errors.NotFound) {
      console.error(`Error: ${err.message}`);
      Deno.exit(1);
    }

    if (err instanceof Deno.errors.InvalidData) {
      console.error(`Error: ${err.message}`);
      Deno.exit(1);
    }

    // Unknown error - show full stack
    console.error(err);
    Deno.exit(1);
  });
}
