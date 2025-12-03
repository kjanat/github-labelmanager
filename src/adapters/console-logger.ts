/**
 * Console logger implementation for local CLI usage
 * @module
 */

import type { AnnotationProperties, ILogger } from "../interfaces/logger.ts";

/** ANSI color codes */
const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
} as const;

/** Check if color output is disabled */
const isNoColor = typeof Deno !== "undefined" ? Deno.noColor : false;

/**
 * Apply color to text if colors are enabled
 */
function colorize(color: string, text: string): string {
  return isNoColor ? text : `${color}${text}${COLORS.reset}`;
}

/**
 * Format annotation properties for display
 */
function formatAnnotation(properties?: AnnotationProperties): string {
  if (!properties) return "";
  const parts: string[] = [];
  if (properties.file) {
    let loc = properties.file;
    if (properties.startLine) {
      loc += `:${properties.startLine}`;
      if (properties.startColumn) {
        loc += `:${properties.startColumn}`;
      }
    }
    parts.push(loc);
  }
  if (properties.title) {
    parts.push(properties.title);
  }
  return parts.length > 0 ? ` (${parts.join(" - ")})` : "";
}

/**
 * Console logger for local CLI usage
 *
 * Features:
 * - Colored output with symbols
 * - Respects NO_COLOR / Deno.noColor
 * - Collapsible groups (visual only in terminal)
 * - Exit handling via Deno.exit
 */
export class ConsoleLogger implements ILogger {
  private groupDepth = 0;

  private get indent(): string {
    return "  ".repeat(this.groupDepth);
  }

  debug(message: string): void {
    // Only show debug in verbose mode (check DEBUG env)
    if (Deno.env.get("DEBUG")) {
      console.debug(
        `${this.indent}${colorize(COLORS.gray, "[debug]")} ${message}`,
      );
    }
  }

  info(message: string): void {
    console.info(
      `${this.indent}${colorize(COLORS.cyan, "[info]")} ${message}`,
    );
  }

  warn(message: string, properties?: AnnotationProperties): void {
    const annotation = formatAnnotation(properties);
    console.warn(
      `${this.indent}${
        colorize(COLORS.yellow, "[warn]")
      } ${message}${annotation}`,
    );
  }

  error(message: string, properties?: AnnotationProperties): void {
    const annotation = formatAnnotation(properties);
    console.error(
      `${this.indent}${
        colorize(COLORS.red, "[error]")
      } ${message}${annotation}`,
    );
  }

  notice(message: string, properties?: AnnotationProperties): void {
    const annotation = formatAnnotation(properties);
    console.info(
      `${this.indent}${
        colorize(COLORS.blue, "[notice]")
      } ${message}${annotation}`,
    );
  }

  startGroup(name: string): void {
    console.info(
      `${this.indent}${colorize(COLORS.bold, ">")} ${name}`,
    );
    this.groupDepth++;
  }

  endGroup(): void {
    if (this.groupDepth > 0) {
      this.groupDepth--;
    }
  }

  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startGroup(name);
    try {
      return await fn();
    } finally {
      this.endGroup();
    }
  }

  setFailed(message: string | Error): void {
    const msg = message instanceof Error ? message.message : message;
    this.error(msg);
    Deno.exit(1);
  }
}

/**
 * Extended console logger with additional CLI-specific methods
 */
export class ExtendedConsoleLogger extends ConsoleLogger {
  /**
   * Log success message (green)
   */
  success(message: string): void {
    const indent = "  ".repeat(0); // Access base indent
    console.log(
      `${indent}${colorize(COLORS.green, "[+]")} ${message}`,
    );
  }

  /**
   * Log skip message (gray)
   */
  skip(message: string): void {
    const indent = "  ".repeat(0);
    console.log(
      `${indent}${colorize(COLORS.gray, "[-]")} ${message}`,
    );
  }
}
