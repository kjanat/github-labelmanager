/**
 * Test utilities for github-labelmanager
 *
 * Provides mock implementations for testing without hitting the GitHub API.
 *
 * @example
 * ```ts
 * import { MockGitHubClient, NullLogger, createTestEnv } from "@kjanat/github-labelmanager";
 * import { LabelManager } from "@kjanat/github-labelmanager";
 *
 * const client = new MockGitHubClient({ labels: [{ name: "bug", color: "d73a4a", description: "Bug" }] });
 * const logger = new NullLogger();
 * const manager = new LabelManager(createTestEnv(), client, logger);
 * ```
 *
 * @module
 */

import type {
  GitHubLabel,
  IGitHubClient,
  LabelOptions,
} from "./adapters/client/mod.ts";
import type { AnnotationProperties, ILogger } from "./adapters/logger/mod.ts";
import type { EnvConfig, SyncResult } from "./types.ts";

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

/**
 * Mock logger that captures all calls for assertions
 *
 * Use this in tests to verify logging behavior and error messages.
 */
export class MockLogger implements ILogger {
  /** Messages passed to setFailed() */
  failedMessages: string[] = [];
  /** All recorded log calls */
  calls: Array<{ method: string; args: unknown[] }> = [];

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  debug(msg: string): void {
    this.record("debug", msg);
  }

  info(msg: string): void {
    this.record("info", msg);
  }

  warn(msg: string, props?: AnnotationProperties): void {
    this.record("warn", msg, props);
  }

  error(msg: string, props?: AnnotationProperties): void {
    this.record("error", msg, props);
  }

  notice(msg: string, props?: AnnotationProperties): void {
    this.record("notice", msg, props);
  }

  startGroup(name: string): void {
    this.record("startGroup", name);
  }

  endGroup(): void {
    this.record("endGroup");
  }

  group<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    this.record("group", _name);
    return fn();
  }

  setFailed(msg: string | Error): void {
    const message = msg instanceof Error ? msg.message : msg;
    this.failedMessages.push(message);
    this.record("setFailed", message);
  }

  success(msg: string): void {
    this.record("success", msg);
  }

  skip(msg: string): void {
    this.record("skip", msg);
  }

  writeSummary(_result: SyncResult): Promise<void> {
    this.record("writeSummary", _result);
    return Promise.resolve();
  }

  /** Helper: check if a method was called */
  wasCalled(method: string): boolean {
    return this.calls.some((c) => c.method === method);
  }

  /** Helper: get all calls for a specific method */
  getCalls(method: string): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }

  /** Helper: reset all recorded calls */
  reset(): void {
    this.calls = [];
    this.failedMessages = [];
  }
}

/** Recorded API call for assertions */
export interface ApiCall {
  method: "list" | "get" | "create" | "update" | "delete";
  args: unknown[];
}

/** Options for creating a MockGitHubClient */
export interface MockGitHubClientOptions {
  owner?: string;
  repo?: string;
  dryRun?: boolean;
  labels?: GitHubLabel[];
}

/**
 * Configurable mock GitHub client for testing
 *
 * Features:
 * - Simulates GitHub API state (labels array)
 * - Records all API calls for assertions
 * - Configurable errors for testing failure paths
 * - Respects isDryRun flag
 */
export class MockGitHubClient implements IGitHubClient {
  readonly owner: string;
  readonly repo: string;
  readonly isDryRun: boolean;

  /** Current labels (mutable - simulates real state) */
  labels: GitHubLabel[];

  /** Errors to throw on specific methods */
  errors: Partial<Record<ApiCall["method"], Error>> = {};

  /** Recorded calls for assertions */
  calls: ApiCall[] = [];

  constructor(options: MockGitHubClientOptions = {}) {
    this.owner = options.owner ?? "test-owner";
    this.repo = options.repo ?? "test-repo";
    this.isDryRun = options.dryRun ?? false;
    this.labels = options.labels ?? [];
  }

  private record(method: ApiCall["method"], ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  private maybeThrow(method: ApiCall["method"]): void {
    if (this.errors[method]) throw this.errors[method];
  }

  list(): Promise<GitHubLabel[]> {
    this.record("list");
    this.maybeThrow("list");
    return Promise.resolve([...this.labels]); // Return copy
  }

  get(name: string): Promise<GitHubLabel | null> {
    this.record("get", name);
    this.maybeThrow("get");
    return Promise.resolve(this.labels.find((l) => l.name === name) ?? null);
  }

  create(options: LabelOptions): Promise<GitHubLabel | null> {
    this.record("create", options);
    this.maybeThrow("create");
    if (this.isDryRun) return Promise.resolve(null);

    const label: GitHubLabel = {
      name: options.name,
      color: options.color?.replace(/^#/, "") ?? "000000",
      description: options.description ?? null,
    };
    this.labels.push(label);
    return Promise.resolve(label);
  }

  update(
    currentName: string,
    options: LabelOptions,
  ): Promise<GitHubLabel | null> {
    this.record("update", currentName, options);
    this.maybeThrow("update");
    if (this.isDryRun) return Promise.resolve(null);

    const idx = this.labels.findIndex((l) => l.name === currentName);
    if (idx === -1) return Promise.resolve(null);

    this.labels[idx] = {
      name: options.new_name ?? currentName,
      color: options.color?.replace(/^#/, "") ?? this.labels[idx].color,
      description: options.description ?? this.labels[idx].description,
    };
    return Promise.resolve(this.labels[idx]);
  }

  delete(name: string): Promise<void> {
    this.record("delete", name);
    this.maybeThrow("delete");
    if (this.isDryRun) return Promise.resolve();

    this.labels = this.labels.filter((l) => l.name !== name);
    return Promise.resolve();
  }

  /** Helper: get calls for a specific method */
  getCalls(method: ApiCall["method"]): ApiCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  /** Helper: check if method was called */
  wasCalled(method: ApiCall["method"]): boolean {
    return this.calls.some((c) => c.method === method);
  }

  /** Helper: reset call history */
  resetCalls(): void {
    this.calls = [];
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

// =============================================================================
// Console Capture Utilities
// =============================================================================

/** Captured console output */
export interface CapturedConsole {
  logs: string[];
  infos: string[];
  warns: string[];
  errors: string[];
  debugs: string[];
  all: Array<{ level: string; args: unknown[] }>;
  restore: () => void;
}

/**
 * Capture console output for testing
 *
 * @returns Captured output arrays and restore function
 *
 * @example
 * ```ts
 * const captured = captureConsole();
 * try {
 *   console.log("hello");
 *   assertEquals(captured.logs, ["hello"]);
 * } finally {
 *   captured.restore();
 * }
 * ```
 */
export function captureConsole(): CapturedConsole {
  const logs: string[] = [];
  const infos: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];
  const debugs: string[] = [];
  const all: Array<{ level: string; args: unknown[] }> = [];

  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
    all.push({ level: "log", args });
  };

  console.info = (...args: unknown[]) => {
    infos.push(args.map(String).join(" "));
    all.push({ level: "info", args });
  };

  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(" "));
    all.push({ level: "warn", args });
  };

  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
    all.push({ level: "error", args });
  };

  console.debug = (...args: unknown[]) => {
    debugs.push(args.map(String).join(" "));
    all.push({ level: "debug", args });
  };

  return {
    logs,
    infos,
    warns,
    errors,
    debugs,
    all,
    restore: () => {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
      console.debug = originalDebug;
    },
  };
}

// =============================================================================
// Fetch Mocking Utilities
// =============================================================================

/** Mock fetch response configuration */
export interface MockFetchResponse {
  status?: number;
  statusText?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Recorded fetch call */
export interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Mock global fetch for testing HTTP clients
 *
 * WARNING: JSON-centric by design. Response bodies are JSON.stringify'd and
 * default to content-type: application/json. String bodies become `"my string"`
 * (JSON), not raw text. Do not use for testing non-JSON HTTP clients.
 *
 * @param handler - Function that returns response based on request
 * @returns Object with calls array and restore function
 *
 * @example
 * ```ts
 * const mock = mockFetch((url, method) => {
 *   if (url.includes("/labels") && method === "GET") {
 *     return { body: [{ name: "bug", color: "d73a4a" }] };
 *   }
 *   return { status: 404 };
 * });
 * try {
 *   // test code that calls fetch
 * } finally {
 *   mock.restore();
 * }
 * ```
 */
export function mockFetch(
  handler: (
    url: string,
    method: string,
    body?: unknown,
  ) => MockFetchResponse | Promise<MockFetchResponse>,
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const method = init?.method ?? "GET";
    const headers: Record<string, string> = {};

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => headers[k] = v);
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) {
          headers[k] = v;
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    let body: unknown;
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }

    calls.push({ url, method, headers, body });

    const response = await handler(url, method, body);
    const responseHeaders = new Headers(response.headers);
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/json");
    }

    return new Response(
      response.body !== undefined ? JSON.stringify(response.body) : null,
      {
        status: response.status ?? 200,
        statusText: response.statusText ?? "OK",
        headers: responseHeaders,
      },
    );
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

// =============================================================================
// Mock @actions/core for testing ActionsLogger
// =============================================================================

/** Recorded @actions/core call */
export interface CoreCall {
  method: string;
  args: unknown[];
}

/** Mock summary object */
export interface MockSummary {
  buffer: string[];
  addHeading: (text: string, level?: number) => MockSummary;
  addTable: (rows: unknown[][]) => MockSummary;
  addDetails: (label: string, content: string) => MockSummary;
  addRaw: (text: string) => MockSummary;
  addList: (items: string[]) => MockSummary;
  write: () => Promise<MockSummary>;
}

/**
 * Create a mock @actions/core module for testing
 *
 * @returns Mock core object with calls tracking
 */
export function createMockActionsCore(): {
  core: typeof import("@actions/core");
  calls: CoreCall[];
  summary: MockSummary;
} {
  const calls: CoreCall[] = [];

  const record = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
  };

  const summary: MockSummary = {
    buffer: [],
    addHeading(text: string, level?: number) {
      this.buffer.push(`h${level ?? 1}:${text}`);
      record("summary.addHeading", text, level);
      return this;
    },
    addTable(rows: unknown[][]) {
      this.buffer.push(`table:${JSON.stringify(rows)}`);
      record("summary.addTable", rows);
      return this;
    },
    addDetails(label: string, content: string) {
      this.buffer.push(`details:${label}:${content}`);
      record("summary.addDetails", label, content);
      return this;
    },
    addRaw(text: string) {
      this.buffer.push(`raw:${text}`);
      record("summary.addRaw", text);
      return this;
    },
    addList(items: string[]) {
      this.buffer.push(`list:${JSON.stringify(items)}`);
      record("summary.addList", items);
      return this;
    },
    write() {
      record("summary.write");
      return Promise.resolve(this);
    },
  };

  const core = {
    debug: (msg: string) => record("debug", msg),
    info: (msg: string) => record("info", msg),
    warning: (msg: string, props?: unknown) => record("warning", msg, props),
    error: (msg: string, props?: unknown) => record("error", msg, props),
    notice: (msg: string, props?: unknown) => record("notice", msg, props),
    startGroup: (name: string) => record("startGroup", name),
    endGroup: () => record("endGroup"),
    group: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      record("group", name);
      return await fn();
    },
    setFailed: (msg: string | Error) => record("setFailed", msg),
    summary,
  };

  return {
    core: core as unknown as typeof import("@actions/core"),
    calls,
    summary,
  };
}

/**
 * Create a minimal EnvConfig for testing
 *
 * @param overrides - Optional values to override defaults
 * @returns EnvConfig with test defaults
 */
export function createTestEnv(
  overrides: Partial<EnvConfig> = {},
): EnvConfig {
  return {
    token: overrides.token ?? "test-token",
    owner: overrides.owner ?? "test-owner",
    repo: overrides.repo ?? "test-repo",
    dryRun: overrides.dryRun ?? false,
    configPath: overrides.configPath,
  };
}

// =============================================================================
// Mock Octokit for testing OctokitClient
// =============================================================================

/** Recorded Octokit request */
export interface OctokitRequest {
  route: string;
  params?: Record<string, unknown>;
}

/** Options for createMockOctokit */
export interface MockOctokitOptions {
  /** Labels to return from list endpoint */
  labels?: Array<{ name: string; color: string; description: string | null }>;
  /** Errors to throw for specific routes */
  errors?: Record<string, Error>;
}

/**
 * Create a mock Octokit instance for testing OctokitClient
 *
 * This avoids the throttling plugin's internal intervals that cause
 * resource leaks in tests.
 *
 * @param options - Configuration for mock behavior
 * @returns Mock Octokit instance compatible with OctokitClient
 *
 * @example
 * ```ts
 * const { octokit, requests } = createMockOctokit({
 *   labels: [{ name: "bug", color: "d73a4a", description: "Bug reports" }]
 * });
 * const client = new OctokitClient(config, logger, octokit);
 * const labels = await client.list();
 * assertEquals(requests[0].route, "GET /repos/{owner}/{repo}/labels");
 * ```
 */
export function createMockOctokit(options: MockOctokitOptions = {}): {
  octokit: import("octokit").Octokit;
  requests: OctokitRequest[];
} {
  const requests: OctokitRequest[] = [];
  const labels = options.labels ?? [];
  const errors = options.errors ?? {};

  // Mock the paginate method which is used by OctokitClient.list()
  // WARNING: Only supports route-string overload: paginate("GET /repos/...", params)
  // Does NOT support function overload: paginate(octokit.rest.issues.listLabelsForRepo, params)
  // If production switches to function overload, update this mock or tests will silently diverge.
  const paginate = (
    route: string,
    params?: Record<string, unknown>,
  ): Promise<unknown[]> => {
    requests.push({ route, params });

    if (errors[route]) {
      return Promise.reject(errors[route]);
    }

    if (route === "GET /repos/{owner}/{repo}/labels") {
      return Promise.resolve(labels);
    }

    return Promise.resolve([]);
  };

  // Mock the rest.issues methods used by BaseGitHubClient
  const rest = {
    issues: {
      getLabel: (params: Record<string, unknown>) => {
        const route = "GET /repos/{owner}/{repo}/labels/{name}";
        requests.push({ route, params });

        if (errors[route]) {
          return Promise.reject(errors[route]);
        }

        const label = labels.find((l) => l.name === params.name);
        if (!label) {
          const error = new Error("Not Found") as Error & { status: number };
          error.status = 404;
          return Promise.reject(error);
        }

        return Promise.resolve({ data: label });
      },
      createLabel: (params: Record<string, unknown>) => {
        const route = "POST /repos/{owner}/{repo}/labels";
        requests.push({ route, params });

        if (errors[route]) {
          return Promise.reject(errors[route]);
        }

        return Promise.resolve({
          data: {
            name: params.name,
            color: (params.color as string)?.replace(/^#/, ""),
            description: params.description ?? null,
          },
        });
      },
      updateLabel: (params: Record<string, unknown>) => {
        const route = "PATCH /repos/{owner}/{repo}/labels/{name}";
        requests.push({ route, params });

        if (errors[route]) {
          return Promise.reject(errors[route]);
        }

        return Promise.resolve({
          data: {
            name: params.new_name ?? params.name,
            color: (params.color as string)?.replace(/^#/, ""),
            description: params.description ?? null,
          },
        });
      },
      deleteLabel: (params: Record<string, unknown>) => {
        const route = "DELETE /repos/{owner}/{repo}/labels/{name}";
        requests.push({ route, params });

        if (errors[route]) {
          return Promise.reject(errors[route]);
        }

        return Promise.resolve({ status: 204 });
      },
    },
  };

  const octokit = {
    paginate,
    rest,
  } as unknown as import("octokit").Octokit;

  return { octokit, requests };
}
