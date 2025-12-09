/**
 * @actions/core mock for bun:test
 */
import { type Mock, mock } from "bun:test";
import type * as core from "@actions/core";
import config from "root/bun-test.yaml" with { type: "yaml" };

// Fetch codeblock content from web source if configured
let webSourceContent: string | null = null;

/** Timeout for web source fetch in milliseconds */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetches content from a URL and stores it for web source replacement.
 * If the response is valid JSON, it will be pretty-printed.
 * Non-JSON responses are stored as-is.
 *
 * @param url - The URL to fetch content from, or null to clear
 */
export async function setWebSource(url: string | null): Promise<void> {
  if (!url) {
    webSourceContent = null;
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[setWebSource] HTTP ${response.status} from ${url}, using original content`,
      );
      return;
    }

    const text = await response.text();
    // Pretty print JSON for readability
    try {
      webSourceContent = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      webSourceContent = text;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[setWebSource] ${isAbort ? "Timeout" : "Fetch error"}: ${message}, using original content`,
    );
    // Fall back to original content, don't rethrow
  }
}

// Initialize from config if set
if (config["codeblock-web-source"]) {
  await setWebSource(config["codeblock-web-source"]);
}

// Core function mocks
export const debug = mock<typeof core.debug>();
export const error = mock<typeof core.error>();
export const info = mock<typeof core.info>();
export const getInput = mock<typeof core.getInput>();
export const setOutput = mock<typeof core.setOutput>();
export const setFailed = mock<typeof core.setFailed>();
export const warning = mock<typeof core.warning>();
export const startGroup = mock<typeof core.startGroup>();
export const endGroup = mock<typeof core.endGroup>();
export const toPlatformPath = mock<typeof core.toPlatformPath>();

// Summary mock with chainable methods
type SummaryInstance = typeof core.summary;

export interface MockSummary {
  addHeading: Mock<SummaryInstance["addHeading"]>;
  addEOL: Mock<SummaryInstance["addEOL"]>;
  addRaw: Mock<SummaryInstance["addRaw"]>;
  addCodeBlock: Mock<SummaryInstance["addCodeBlock"]>;
  addQuote: Mock<SummaryInstance["addQuote"]>;
  addDetails: Mock<SummaryInstance["addDetails"]>;
  write: Mock<SummaryInstance["write"]>;
  _buffer: string;
  _filePath: string | null;
  _getBuffer: () => string;
  _getWrittenContent: () => string | null;
  _reset: () => void;
}

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let summaryTempDir: string | null = null;
let summaryFilePath: string | null = null;

function createMockSummary(): MockSummary {
  let buffer = "";

  const summary: MockSummary = {
    _buffer: "",
    _filePath: null,

    addHeading: mock((text: string, level?: number | string) => {
      const lvl = typeof level === "number" ? level : 1;
      buffer += `<h${lvl}>${text}</h${lvl}>\n`;
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    addEOL: mock(() => {
      buffer += "\n";
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    addRaw: mock((text: string, addEOL?: boolean) => {
      buffer += text;
      if (addEOL) buffer += "\n";
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    addCodeBlock: mock((code: string, lang?: string) => {
      const langAttr = lang ? ` lang="${lang}"` : "";
      buffer += `<pre${langAttr}><code>${code}</code></pre>\n`;
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    addQuote: mock((text: string, cite?: string) => {
      const citeAttr = cite ? ` cite="${cite}"` : "";
      buffer += `<blockquote${citeAttr}>${text}</blockquote>\n`;
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    addDetails: mock((label: string, content: string) => {
      let finalContent = content;
      // If web source is configured and content contains a JSON codeblock, replace it
      if (webSourceContent) {
        if (content.includes("```json")) {
          // Markdown fence format
          finalContent = `\n\n\`\`\`json\n${webSourceContent}\n\`\`\`\n\n`;
        } else if (content.includes('<pre lang="json">')) {
          // HTML pre/code format
          finalContent =
            `<pre lang="json"><code>${webSourceContent}</code></pre>`;
        }
      }
      buffer +=
        `<details><summary>${label}</summary>${finalContent}</details>\n`;
      summary._buffer = buffer;
      return summary as unknown as SummaryInstance;
    }),

    write: mock(() => {
      // Dump raw summary if enabled in config
      if (config["dump-raw-summaries"]) {
        console.log("\n=== RAW SUMMARY ===");
        console.log(buffer);
        console.log("===================\n");
      }

      if (!summaryFilePath) {
        summaryTempDir = mkdtempSync(join(tmpdir(), "bun-test-summary-"));
        summaryFilePath = join(summaryTempDir, "summary.md");
      }
      writeFileSync(summaryFilePath, buffer, "utf-8");
      summary._filePath = summaryFilePath;
      buffer = "";
      summary._buffer = "";
      return Promise.resolve(summary as unknown as SummaryInstance);
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
      summary._buffer = "";
      summary._filePath = null;
    },
  };

  return summary;
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

/** Clear all core mocks */
export function clearCoreMocks(): void {
  debug.mockClear();
  error.mockClear();
  info.mockClear();
  getInput.mockClear();
  setOutput.mockClear();
  setFailed.mockClear();
  warning.mockClear();
  startGroup.mockClear();
  endGroup.mockClear();
  toPlatformPath.mockClear();
  summary.addHeading.mockClear();
  summary.addEOL.mockClear();
  summary.addRaw.mockClear();
  summary.addCodeBlock.mockClear();
  summary.addQuote.mockClear();
  summary.addDetails.mockClear();
  summary.write.mockClear();
  summary._reset();
  webSourceContent = null;
}
