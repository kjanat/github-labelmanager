/**
 * Padding option for code fence output.
 * - `false` - No padding (0 newlines)
 * - `true` - Default padding (2 newlines)
 * - `number` - Explicit number of newlines before/after fence
 */
export type FencePadding = boolean | number;

/**
 * Wraps code in a markdown fenced code block.
 *
 * Automatically uses longer fence sequences when the code contains backticks,
 * ensuring nested code blocks and regex patterns are properly escaped.
 *
 * @param lang - Language identifier (e.g., `"diff"`, `"json"`, `"typescript"`), or `undefined` for plain text
 * @param code - Code content to wrap (will be trimmed)
 * @param pad - Newlines before/after fence
 * @default pad false
 * @returns Markdown fenced code block string
 *
 * @example Basic usage
 * ```ts
 * codeFence("json", '{"key": "value"}')
 * // Returns:
 * // ```json
 * // {"key": "value"}
 * // ```
 * ```
 *
 * @example With padding
 * ```ts
 * codeFence("diff", "-old\n+new", 2)
 * // Returns:
 * // (2 blank lines)
 * // ```diff
 * // -old
 * // +new
 * // ```
 * // (2 blank lines)
 * ```
 *
 * @example Nested backticks (auto-escapes)
 * ```ts
 * codeFence("md", "Use ```js for code blocks")
 * // Returns:
 * // ````md
 * // Use ```js for code blocks
 * // ````
 * ```
 */
export function codeFence(
  lang: string | undefined,
  code: string,
  pad: FencePadding = false,
): string {
  // Find longest backtick sequence in code, use at least 3
  const matches = code.match(/`+/g);
  const maxBackticks = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  const fenceLen = Math.max(3, maxBackticks + 1);
  const fence = "`".repeat(fenceLen);

  // Calculate padding
  let amount = 0;
  if (typeof pad === "boolean") {
    amount = pad ? 2 : 0;
  } else {
    amount = Math.max(0, pad | 0);
  }

  const padStr = "\n".repeat(amount);
  return `${padStr}${fence}${lang ?? ""}\n${code.trim()}\n${fence}${padStr}`;
}
