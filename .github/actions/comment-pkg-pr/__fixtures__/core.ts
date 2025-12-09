/**
 * Type-safe @actions/core mock for bun:test
 */
import { type Mock, mock } from "bun:test";
import type * as core from "@actions/core";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Core function mocks with exact type signatures
export const debug: Mock<typeof core.debug> = mock();
export const info: Mock<typeof core.info> = mock();
export const warning: Mock<typeof core.warning> = mock();
export const error: Mock<typeof core.error> = mock();
export const getInput: Mock<typeof core.getInput> = mock();
export const setOutput: Mock<typeof core.setOutput> = mock();
export const setFailed: Mock<typeof core.setFailed> = mock();

// Summary mock types

export interface MockSummary {
  addRaw: Mock<(text: string, addEOL?: boolean) => MockSummary>;
  write: Mock<() => Promise<MockSummary>>;
  _buffer: string;
  _filePath: string | null;
  _getBuffer: () => string;
  _getWrittenContent: () => string | null;
  _reset: () => void;
}

let summaryTempDir: string | null = null;
let summaryFilePath: string | null = null;

function createMockSummary(): MockSummary {
  let buffer = "";

  const summaryObj: MockSummary = {
    _buffer: "",
    _filePath: null,

    addRaw: mock((text: string, addEOL?: boolean) => {
      buffer += text;
      if (addEOL) buffer += "\n";
      summaryObj._buffer = buffer;
      return summaryObj;
    }),

    write: mock(async () => {
      if (!summaryFilePath) {
        summaryTempDir = mkdtempSync(join(tmpdir(), "bun-test-summary-"));
        summaryFilePath = join(summaryTempDir, "summary.md");
      }
      writeFileSync(summaryFilePath, buffer, "utf-8");
      summaryObj._filePath = summaryFilePath;
      return summaryObj;
    }),

    _getBuffer: () => buffer,

    _getWrittenContent: () => {
      if (!summaryFilePath) return null;
      try {
        return readFileSync(summaryFilePath, "utf-8");
      } catch {
        return null;
      }
    },

    _reset: () => {
      buffer = "";
      summaryObj._buffer = "";
      summaryObj._filePath = null;
    },
  };

  return summaryObj;
}

export const summary = createMockSummary();

/** Cleanup temp files created by summary mock */
export function cleanupSummary(): void {
  if (summaryTempDir) {
    try {
      rmSync(summaryTempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    summaryTempDir = null;
    summaryFilePath = null;
  }
}

/** Clear all core mocks and reset state */
export function clearCoreMocks(): void {
  debug.mockClear();
  info.mockClear();
  warning.mockClear();
  error.mockClear();
  getInput.mockClear();
  setOutput.mockClear();
  setFailed.mockClear();
  summary.addRaw.mockClear();
  summary.write.mockClear();
  summary._reset();
}
