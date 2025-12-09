/**
 * Mock implementations for testing
 * @module
 */

import type {
  GitHubLabel,
  IGitHubClient,
  LabelOptions,
} from "~/ports/github.ts";
import type { AnnotationProperties, ILogger } from "~/ports/logger.ts";
import type { SyncResult } from "~/domain/types.ts";

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
