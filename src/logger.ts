/**
 * Logging utilities with colored output
 * @module
 */

/** ANSI color codes */
export const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

/** Check if color output is disabled */
const isNoColor = typeof Deno !== "undefined" ? Deno.noColor : false;

/** Log level configuration */
export const LOG_LEVELS = {
  info: { color: COLORS.cyan, symbol: "i", method: "info" as const },
  success: { color: COLORS.green, symbol: "+", method: "log" as const },
  warn: { color: COLORS.yellow, symbol: "!", method: "warn" as const },
  error: { color: COLORS.red, symbol: "x", method: "error" as const },
  skip: { color: COLORS.gray, symbol: "-", method: "log" as const },
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/** Logger interface */
export type Logger = Record<LogLevel, (msg: string) => void>;

/** Create a logger instance */
export function createLogger(): Logger {
  return (Object.keys(LOG_LEVELS) as LogLevel[]).reduce((acc, level) => {
    const { color, symbol, method } = LOG_LEVELS[level];

    acc[level] = (msg: string) => {
      const prefix = isNoColor
        ? `[${symbol}]`
        : `${color}[${symbol}]${COLORS.reset}`;
      console[method](`${prefix} ${msg}`);
    };

    return acc;
  }, {} as Logger);
}

/** Default logger instance */
export const logger: Logger = createLogger();
