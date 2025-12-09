/**
 * Stub utilities for testing
 * @module
 */

import type { AnnotationProperties, ILogger } from "~/ports/logger.ts";
import type { SyncResult } from "~/domain/types.ts";

/**
 * No-op logger that silences all output
 *
 * Use this in tests to prevent console spam while still exercising
 * code paths that call logger methods.
 */
export class NullLogger implements ILogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string, _props?: AnnotationProperties): void {}
  error(_msg: string, _props?: AnnotationProperties): void {}
  notice(_msg: string, _props?: AnnotationProperties): void {}
  startGroup(_name: string): void {}
  endGroup(): void {}
  group<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
  setFailed(_msg: string | Error): void {}
  success(_msg: string): void {}
  skip(_msg: string): void {}
  writeSummary(_result: SyncResult): Promise<void> {
    return Promise.resolve();
  }
}

// =============================================================================
// Environment Stubbing Utilities
// =============================================================================

/**
 * Stub Deno.env for testing
 *
 * @param vars - Environment variables to set (undefined removes the var)
 * @returns Restore function to call in cleanup
 *
 * @example
 * ```ts
 * const restore = stubEnv({ GITHUB_TOKEN: "test-token", DEBUG: undefined });
 * try {
 *   // test code
 * } finally {
 *   restore();
 * }
 * ```
 */
export function stubEnv(
  vars: Record<string, string | undefined>,
): () => void {
  const original: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(vars)) {
    original[key] = Deno.env.get(key);
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };
}

/**
 * Stub Deno.args for testing
 *
 * @param args - Arguments to set
 * @returns Restore function
 * @throws Error if stubbing fails (Deno.args remains unchanged)
 *
 * @example
 * ```ts
 * const restore = stubArgs(["owner/repo", "--dry-run"]);
 * try {
 *   // Deno.args is now ["owner/repo", "--dry-run"]
 * } finally {
 *   restore();
 * }
 * ```
 */
export function stubArgs(args: string[]): () => void {
  const original = [...Deno.args];

  // Deno.args is normally read-only, but we can override it for testing
  try {
    Object.defineProperty(Deno, "args", {
      value: args,
      writable: true,
      configurable: true,
    });
  } catch (err) {
    throw new Error(
      `Failed to stub Deno.args: ${err}. ` +
        "Consider refactoring code to accept args as a parameter.",
    );
  }

  // Verify the stub worked
  if (Deno.args !== args) {
    throw new Error(
      "stubArgs failed: Deno.args was not updated. " +
        "This may happen in strict mode or frozen objects.",
    );
  }

  return () => {
    Object.defineProperty(Deno, "args", {
      value: original,
      writable: true,
      configurable: true,
    });
  };
}

/**
 * Stub Deno.exit for testing
 *
 * Prevents actual process termination and captures exit codes.
 *
 * @returns Object with exitCodes array and restore function
 */
export function stubExit(): { exitCodes: number[]; restore: () => void } {
  const exitCodes: number[] = [];
  const original = Deno.exit;

  // deno-lint-ignore no-explicit-any
  (Deno as any).exit = (code?: number) => {
    exitCodes.push(code ?? 0);
    // Throw to stop execution (simulates exit behavior)
    throw new ExitStubError(code ?? 0);
  };

  return {
    exitCodes,
    restore: () => {
      // deno-lint-ignore no-explicit-any
      (Deno as any).exit = original;
    },
  };
}

/** Error thrown by stubbed Deno.exit */
export class ExitStubError extends Error {
  constructor(public code: number) {
    super(`Deno.exit(${code}) was called`);
    this.name = "ExitStubError";
  }
}
