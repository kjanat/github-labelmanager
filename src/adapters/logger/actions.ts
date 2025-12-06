/**
 * GitHub Actions logger implementation using @actions/core
 * @module
 */

import * as defaultCore from "@actions/core";
import type { AnnotationProperties, ILogger } from "./types.ts";
import type { SyncOperation, SyncResult } from "@/types.ts";

/** Minimum number of operations before collapsing details in summary */
const COLLAPSE_THRESHOLD = 5;

/**
 * Subset of @actions/core used by ActionsLogger (for testability)
 */
export interface ActionsCore {
  debug(message: string): void;
  info(message: string): void;
  warning(
    message: string | Error,
    properties?: defaultCore.AnnotationProperties,
  ): void;
  error(
    message: string | Error,
    properties?: defaultCore.AnnotationProperties,
  ): void;
  notice(
    message: string | Error,
    properties?: defaultCore.AnnotationProperties,
  ): void;
  startGroup(name: string): void;
  endGroup(): void;
  group<T>(name: string, fn: () => Promise<T>): Promise<T>;
  setFailed(message: string | Error): void;
  summary: {
    addHeading(text: string, level?: number): unknown;
    addTable(rows: unknown[][]): unknown;
    addDetails(label: string, content: string): unknown;
    addRaw(text: string): unknown;
    addList(items: string[]): unknown;
    write(): Promise<unknown>;
  };
}

/**
 * Convert our annotation properties to @actions/core format
 */
export function toActionsAnnotation(
  properties?: AnnotationProperties,
): defaultCore.AnnotationProperties | undefined {
  if (!properties) return undefined;
  return {
    title: properties.title,
    file: properties.file,
    startLine: properties.startLine,
    endLine: properties.endLine,
    startColumn: properties.startColumn,
    endColumn: properties.endColumn,
  };
}

/**
 * GitHub Actions logger using @actions/core
 *
 * Features:
 * - Native Actions workflow commands
 * - Annotations visible in PR and Actions UI
 * - Collapsible groups in logs
 * - Proper exit code handling via core.setFailed
 */
export class ActionsLogger implements ILogger {
  private readonly core: ActionsCore;

  constructor(core: ActionsCore = defaultCore) {
    this.core = core;
  }

  debug(message: string): void {
    this.core.debug(message);
  }

  info(message: string): void {
    this.core.info(message);
  }

  warn(message: string, properties?: AnnotationProperties): void {
    this.core.warning(message, toActionsAnnotation(properties));
  }

  error(message: string, properties?: AnnotationProperties): void {
    this.core.error(message, toActionsAnnotation(properties));
  }

  notice(message: string, properties?: AnnotationProperties): void {
    this.core.notice(message, toActionsAnnotation(properties));
  }

  startGroup(name: string): void {
    this.core.startGroup(name);
  }

  endGroup(): void {
    this.core.endGroup();
  }

  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return await this.core.group(name, fn);
  }

  setFailed(message: string | Error): void {
    this.core.setFailed(message);
  }

  success(message: string): void {
    // Actions doesn't have a success level, use info
    this.core.info(message);
  }

  skip(message: string): void {
    // Skip messages are low priority, use debug (hidden unless ACTIONS_STEP_DEBUG=true)
    this.core.debug(message);
  }

  async writeSummary(result: SyncResult): Promise<void> {
    const { summary, operations } = result;
    const total = summary.created +
      summary.updated +
      summary.renamed +
      summary.deleted +
      summary.failed;

    // Status emoji based on result
    const status = result.success ? ":white_check_mark:" : ":x:";

    // Build summary header
    this.core.summary.addHeading(`Label Sync ${status}`, 2);

    // Add counts table
    this.core.summary.addTable([
      [
        { data: "Created", header: true },
        { data: "Updated", header: true },
        { data: "Renamed", header: true },
        { data: "Deleted", header: true },
        { data: "Failed", header: true },
      ],
      [
        String(summary.created),
        String(summary.updated),
        String(summary.renamed),
        String(summary.deleted),
        String(summary.failed),
      ],
    ]);

    // Add operation details if any changes were made
    const changedOps = operations.filter(
      (op) => op.type !== "skip" && op.success,
    );

    if (changedOps.length > 0) {
      const detailsContent = this.formatOperationsTable(changedOps);

      // Collapse if many items, inline otherwise
      if (changedOps.length >= COLLAPSE_THRESHOLD) {
        this.core.summary.addDetails("Operation Details", detailsContent);
      } else {
        this.core.summary.addRaw(detailsContent);
      }
    }

    // Add failed operations if any
    const failedOps = operations.filter((op) => !op.success);
    if (failedOps.length > 0) {
      this.core.summary.addHeading("Failed Operations", 3);
      this.core.summary.addList(
        failedOps.map((op) =>
          `${op.label} (${op.type}): ${op.error || "Unknown error"}`
        ),
      );
    }

    // Only write if there were actual changes (not just skips)
    if (total > 0 || failedOps.length > 0) {
      await this.core.summary.write();
    } else if (summary.skipped > 0) {
      // All labels already in sync - write minimal summary
      this.core.summary.addHeading("Label Sync :white_check_mark:", 2);
      this.core.summary.addRaw(
        `All ${summary.skipped} label(s) already in sync. No changes needed.`,
      );
      await this.core.summary.write();
    }
  }

  /**
   * Format operations as markdown table with color swatches
   */
  private formatOperationsTable(operations: SyncOperation[]): string {
    const rows = operations.map((op) => {
      const colorSwatch = op.details?.color ? `\`#${op.details.color}\`` : "";
      const desc = op.details?.description
        ? op.details.description.slice(0, 50)
        : "";

      let action: string;
      switch (op.type) {
        case "create":
          action = ":new: Created";
          break;
        case "update":
          action = ":pencil2: Updated";
          break;
        case "rename":
          action = `:arrows_counterclockwise: Renamed from "${op.from}"`;
          break;
        case "delete":
          action = ":wastebasket: Deleted";
          break;
        default:
          action = op.type;
      }

      return `| ${op.label} | ${action} | ${colorSwatch} | ${desc} |`;
    });

    return `
| Label | Action | Color | Description |
|-------|--------|-------|-------------|
${rows.join("\n")}
`;
  }
}
