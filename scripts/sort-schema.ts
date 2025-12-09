#!/usr/bin/env -S deno run -A

/**
 * Deno script to sort a JSON schema with priority key ordering.
 *
 * @module
 * @tutorial
 * ```bash
 * deno run -A scripts/sort-schema.ts schema.json           # stdout
 * deno run -A scripts/sort-schema.ts -i schema.json        # in-place
 * deno run -A scripts/sort-schema.ts -o out.json in.json   # to file
 * cat schema.json | ./scripts/sort-schema.ts -   # stdin
 * ```
 */

import { parseArgs } from "jsr:@std/cli@^1.0.24/parse-args";
import { Spinner } from "jsr:@std/cli@^1.0.24/unstable-spinner";
import {
  bold,
  cyan,
  dim,
  green,
  red,
  yellow,
} from "jsr:@std/fmt@^1.0.8/colors";
import { basename, dirname } from "jsr:@std/path@^1.1.3";

// ============================================================================
// Configuration flags
// ============================================================================

/** Demo delay for spinner showcase (enable with SPINNER_DELAY=1) */
const DEMO_DELAY = Deno.env.get("SPINNER_DELAY") === "1";

/** Show spinner when reading from stdin (default: false) */
const SPINNER_ON_STDIN = false;

// ============================================================================
// Types
// ============================================================================

/** JSON value types */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

/** JSON object with string keys */
export interface JsonObject {
  [key: string]: JsonValue;
}

// ============================================================================
// Schema key priority ordering
// ============================================================================

/**
 * Priority-based schema key ordering for JSON Schema organization.
 * Ensures metadata, structure, and validation follow logical hierarchy.
 * Keys not listed default to priority 1000 and sort alphabetically.
 */
const SCHEMA_KEY_PRIORITY = {
  // Metadata (top priority)
  "$schema": 0,
  "$id": 1,
  "$ref": 2,
  "$defs": 3,
  "definitions": 4, // legacy

  "title": 5,
  "description": 6,

  // Structural keywords
  "type": 10,
  "properties": 11,
  "patternProperties": 12,
  "required": 13,
  "additionalProperties": 14,
  "unevaluatedProperties": 15,

  // Array-specific
  "items": 20,
  "additionalItems": 21,
  "minItems": 22,
  "maxItems": 23,
  "uniqueItems": 24,

  // Validation constraints
  "enum": 30,
  "const": 31,
  "pattern": 32,
  "minLength": 33,
  "maxLength": 34,
  "minimum": 35,
  "maximum": 36,
  "exclusiveMinimum": 37,
  "exclusiveMaximum": 38,
  "multipleOf": 39,

  // Logical operators
  "allOf": 50,
  "anyOf": 51,
  "oneOf": 52,
  "not": 53,
  "if": 54,
  "then": 55,
  "else": 56,

  // Annotations (lower priority)
  "examples": 60,
  "default": 61,
  "deprecated": 62,
  "readOnly": 63,
  "writeOnly": 64,
  "contentMediaType": 65,
  "contentEncoding": 66,
} as const;

type PriorityKey = keyof typeof SCHEMA_KEY_PRIORITY;

// ============================================================================
// Help
// ============================================================================

/** Get display path for script */
function getDisplayPath(): string {
  const scriptPath: string = import.meta.filename ?? "sort-schema.ts";
  const scriptName: string = basename(scriptPath);
  const parentDir: string = basename(dirname(scriptPath));
  return parentDir === "scripts" ? `scripts/${scriptName}` : scriptName;
}

/** Print help message */
function printHelp(): void {
  const dp = getDisplayPath();

  console.log(`${bold("Sort JSON schema")} with priority key ordering.

${bold(cyan("Usage:"))} deno run -A ${dp} [OPTIONS] <input.json>
       deno run -A ${dp} [OPTIONS] -  ${dim("(read from stdin)")}

${bold(cyan("Options:"))}
  ${bold("-h")}, ${bold("--help")}          Show this help message
  ${bold("-i")}, ${bold("--in-place")}      Modify input file in place
  ${bold("-o")}, ${bold("--output")} FILE   Write output to FILE

${bold(cyan("Environment:"))}
  ${yellow("SPINNER_DELAY")}=1     Enable 1-second demo delay
  ${yellow("NO_COLOR")}=1          Disable colored output

${bold(cyan("Key Priority Order:"))}
  ${cyan("1.")} Metadata:    $schema, $id, $ref, $defs, title, description
  ${cyan("2.")} Structure:   type, properties, required, additionalProperties
  ${cyan("3.")} Arrays:      items, minItems, maxItems, uniqueItems
  ${cyan("4.")} Validation:  enum, pattern, minLength, minimum, etc.
  ${cyan("5.")} Logical:     allOf, anyOf, oneOf, not, if/then/else
  ${cyan("6.")} Annotations: examples, default, deprecated
  ${cyan("7.")} Custom:      ${dim("(alphabetical)")}

${bold(cyan("Examples:"))}
  deno run -A ${dp} schema.json            ${dim("# stdout")}
  deno run -A ${dp} -i schema.json         ${dim("# in-place")}
  deno run -A ${dp} -o out.json in.json    ${dim("# to file")}
  cat schema.json | ./${dp} -              ${dim("# stdin -> stdout")}
  cat schema.json | ./${dp} - -o out.json  ${dim("# stdin -> file")}`);
}

// ============================================================================
// Core functions
// ============================================================================

/**
 * Recursively sorts a JSON schema object with priority key ordering.
 * Non-priority keys are sorted alphabetically after priority keys.
 */
export function sortSchema(obj: JsonValue): JsonValue {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const entries = Object.entries(obj as JsonObject);

  entries.sort(([a], [b]) => {
    const pa = SCHEMA_KEY_PRIORITY[a as PriorityKey] ?? 1000;
    const pb = SCHEMA_KEY_PRIORITY[b as PriorityKey] ?? 1000;
    return pa !== pb ? pa - pb : a.localeCompare(b);
  });

  const sorted: JsonObject = {};
  for (const [key, value] of entries) {
    sorted[key] = sortSchema(value);
  }
  return sorted;
}

/**
 * Read JSON from stdin
 */
async function readStdin(): Promise<JsonValue> {
  try {
    const text = await new Response(Deno.stdin.readable).text();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON from stdin: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Read file and parse JSON with error handling
 */
async function readJsonFile(filePath: string): Promise<JsonValue> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Read input from file or stdin
 */
function readInput(path: string): Promise<JsonValue> {
  if (path === "-") {
    return readStdin();
  }
  return readJsonFile(path);
}

/**
 * Write JSON to file with formatting
 */
async function writeJsonFile(filePath: string, data: JsonValue): Promise<void> {
  const json = JSON.stringify(data, null, 2) + "\n";
  await Deno.writeTextFile(filePath, json);
}

// ============================================================================
// Main CLI
// ============================================================================

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "in-place"],
    string: ["output"],
    alias: { h: "help", i: "in-place", o: "output" },
    "--": true, // Collect everything after -- as positionals
    unknown: (arg: string) => {
      // Allow "-" as positional (stdin marker)
      if (arg === "-") {
        return true;
      }
      if (arg.startsWith("-")) {
        console.error(
          `${red("Error:")} Unknown option: ${arg}. See --help for usage.`,
        );
        Deno.exit(1);
      }
      return true;
    },
  });

  // Help requested
  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  // No args = show help + error
  if (args._.length === 0) {
    printHelp();
    console.error("");
    console.error(`${red("Error:")} exactly one input file required`);
    Deno.exit(1);
  }

  // Validate mutual exclusion
  if (args["in-place"] && args.output) {
    console.error(
      `${red("Error:")} --in-place and --output are mutually exclusive`,
    );
    Deno.exit(1);
  }

  // Require exactly one positional argument
  if (args._.length !== 1) {
    console.error(`${red("Error:")} exactly one input file required`);
    console.error(`Try ${bold("--help")} for usage information`);
    Deno.exit(1);
  }

  const inputPath: string = String(args._[0]);
  const isStdin = inputPath === "-";

  // Validate stdin + in-place
  if (args["in-place"] && isStdin) {
    console.error(`${red("Error:")} --in-place cannot be used with stdin`);
    Deno.exit(1);
  }

  // Determine if spinner should be used
  const useSpinner = !isStdin || SPINNER_ON_STDIN;

  // Start spinner (writes to stderr)
  let spinner: Spinner | null = null;
  if (useSpinner) {
    spinner = new Spinner({ message: "Sorting schema...", color: "cyan" });
    spinner.start();
  }

  try {
    const schema = await readInput(inputPath);
    const sorted = sortSchema(schema);

    // Demo delay to showcase spinner (tromgeroffel!)
    if (DEMO_DELAY && useSpinner) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    spinner?.stop();

    // Output
    if (args["in-place"]) {
      await writeJsonFile(inputPath, sorted);
      console.error(`${green("Sorted:")} ${inputPath}`);
    } else if (args.output) {
      await writeJsonFile(args.output, sorted);
      console.error(`${green("Sorted:")} ${inputPath} -> ${args.output}`);
    } else {
      const output = JSON.stringify(sorted, null, 2) + "\n";
      await Deno.stdout.write(new TextEncoder().encode(output));
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

// Only run CLI when executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `${red("Error:")} ${error instanceof Error ? error.message : error}`,
    );
    Deno.exit(1);
  });
}
