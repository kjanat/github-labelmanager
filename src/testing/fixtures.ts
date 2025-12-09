/**
 * Test fixtures and utility functions
 * @module
 */

import type { EnvConfig } from "~/domain/types.ts";

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
  written: boolean;
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
    written: false,
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
      this.written = true;
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

/**
 * Create an envGet function from a record of environment variables
 *
 * Use this to create a custom environment getter for testing without
 * mutating global state.
 *
 * @param env - Record of environment variable names to values
 * @returns Function that looks up keys in the provided record
 *
 * @example
 * ```ts
 * const envGet = createEnvGet({ GITHUB_TOKEN: "test-token", DEBUG: undefined });
 * assertEquals(envGet("GITHUB_TOKEN"), "test-token");
 * assertEquals(envGet("DEBUG"), undefined);
 * ```
 */
export function createEnvGet(
  env: Record<string, string | undefined>,
): (key: string) => string | undefined {
  return (key: string) => env[key];
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
