/**
 * GitHub Actions logger implementation using @actions/core
 * @module
 */

import * as core from "@actions/core";
import type { AnnotationProperties, ILogger } from "@/interfaces/logger.ts";

/**
 * Convert our annotation properties to @actions/core format
 */
function toActionsAnnotation(
  properties?: AnnotationProperties,
): core.AnnotationProperties | undefined {
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
  debug(message: string): void {
    core.debug(message);
  }

  info(message: string): void {
    core.info(message);
  }

  warn(message: string, properties?: AnnotationProperties): void {
    core.warning(message, toActionsAnnotation(properties));
  }

  error(message: string, properties?: AnnotationProperties): void {
    core.error(message, toActionsAnnotation(properties));
  }

  notice(message: string, properties?: AnnotationProperties): void {
    core.notice(message, toActionsAnnotation(properties));
  }

  startGroup(name: string): void {
    core.startGroup(name);
  }

  endGroup(): void {
    core.endGroup();
  }

  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return await core.group(name, fn);
  }

  setFailed(message: string | Error): void {
    core.setFailed(message);
  }
}
