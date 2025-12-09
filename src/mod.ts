/**
 * GitHub Label Manager
 *
 * Sync GitHub repository labels from a YAML configuration file.
 *
 * @example
 * ```ts
 * import { LabelManager, loadConfig, syncLabels } from "@kjanat/github-labelmanager";
 *
 * const token = Deno.env.get("GITHUB_TOKEN");
 * if (!token) {
 *   throw new Error("GITHUB_TOKEN required");
 * }
 *
 * const config = await loadConfig(".github/labels.yml");
 * const manager = new LabelManager({
 *   token,
 *   owner: "owner",
 *   repo: "repo",
 *   dryRun: false,
 * });
 *
 * const result = await syncLabels(manager, config);
 * console.log(result.summary);
 * ```
 *
 * For testing, this module also exports `MockGitHubClient`, `NullLogger`, and `createTestEnv`.
 *
 * @module
 */

// Domain
export * from "./domain/mod.ts";

// Ports (interfaces)
export * from "./ports/mod.ts";

// Infrastructure (adapters)
export * from "./adapters/client/mod.ts";
export * from "./adapters/logger/mod.ts";

// Application
export * from "./client.ts";
export * from "./sync.ts";
export * from "./config.ts";
export * from "./factory.ts";
export * from "./schema.ts";

// Testing (separate export in deno.json, but also available here)
export * from "./testing/mod.ts";

// CLI entry point
export { main } from "$/cli/main.ts";
export type { MainOptions } from "$/cli/main.ts";
