/**
 * Logger interface for environment-agnostic logging
 * @module
 */

import type { SyncResult } from "~/types.ts";

/**
 * Annotation properties for marking specific file locations
 */
export interface AnnotationProperties {
  /** A title for the annotation */
  title?: string;
  /** The name of the file for which the annotation should be created */
  file?: string;
  /** The start line for the annotation */
  startLine?: number;
  /** The end line for the annotation */
  endLine?: number;
  /** The start column for the annotation */
  startColumn?: number;
  /** The end column for the annotation */
  endColumn?: number;
}

/**
 * Logger interface supporting both local CLI and GitHub Actions environments
 *
 * Implementations:
 * - ConsoleLogger: Colored console output for local CLI
 * - ActionsLogger: GitHub Actions workflow commands via @actions/core
 */
export interface ILogger {
  /**
   * Log debug message (hidden by default in Actions)
   */
  debug(message: string): void;

  /**
   * Log informational message
   */
  info(message: string): void;

  /**
   * Log warning message (creates annotation in Actions)
   */
  warn(message: string, properties?: AnnotationProperties): void;

  /**
   * Log error message (creates annotation in Actions)
   */
  error(message: string, properties?: AnnotationProperties): void;

  /**
   * Log notice message (creates annotation in Actions)
   */
  notice(message: string, properties?: AnnotationProperties): void;

  /**
   * Start a collapsible group in logs
   */
  startGroup(name: string): void;

  /**
   * End the current collapsible group
   */
  endGroup(): void;

  /**
   * Execute function within a collapsible group
   */
  group<T>(name: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Set the action as failed with message and exit code 1
   * In CLI mode, this logs error and sets exit code
   */
  setFailed(message: string | Error): void;

  /**
   * Log success message
   * CLI: Green colored output
   * Actions: Maps to core.info()
   */
  success(message: string): void;

  /**
   * Log skip/no-op message
   * CLI: Gray colored output
   * Actions: Maps to core.debug() (hidden unless debug enabled)
   */
  skip(message: string): void;

  /**
   * Write a summary of the sync operation
   * CLI: No-op (results already printed inline)
   * Actions: Writes markdown step summary via @actions/core
   */
  writeSummary(result: SyncResult): Promise<void>;
}
