// Branded Type Utilities

declare const __brand: unique symbol;

/**
 * Creates a branded type that is structurally a string but nominally distinct.
 * Prevents accidental mixing of different string types.
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Hex Color Type (compile-time validation)
 */
type HexDigit = // deno-fmt-ignore
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "a" | "b" | "c" | "d" | "e" | "f"
  | "A" | "B" | "C" | "D" | "E" | "F";

type HexChars<S extends string> = // deno-fmt-ignore
  S extends `${infer A}${infer B}${infer C}${infer D}${infer E}${infer F}${infer Rest}`
    ? Rest extends "" ? [A, B, C, D, E, F] : never
    : never;

type InvalidChar<T extends string[], I extends number = 0> = // deno-fmt-ignore
  T extends [infer H extends string, ...infer R extends string[]]
    ? H extends HexDigit ? InvalidChar<R, [...[0], ...Array<I>]["length"] & number> : I
    : -1;

/**
 * Validates a hex color string at compile time.
 * Returns the string if valid, or an error message type if invalid.
 */
type ValidateHex<S extends string> = // deno-fmt-ignore
  HexChars<S> extends never
    ? "Must be exactly 6 characters"
    : InvalidChar<HexChars<S>> extends -1
      ? S
      : `Invalid char at position ${InvalidChar<HexChars<S>>}`;

/**
 * A valid 6-character hexadecimal color code (without `#`).
 * Used for runtime branding.
 */
type HexColor = ValidateHex<string>;

// Branded Types

/**
 * A non-empty label name.
 *
 * @see {@link https://github.com/ikatyang/emoji-cheat-sheet Emoji cheat sheet}
 */
export type LabelName = Brand<string, "LabelName">;

/**
 * A label description (max 100 characters).
 */
export type LabelDescription = Brand<string, "LabelDescription">;

/**
 * A validated hexadecimal color code without the leading `#`.
 *
 * @see {@link http://www.color-hex.com/ Hexadecimal color codes}
 */
export type LabelColor = Brand<HexColor, "LabelColor">;

// Validation & Type Guards
const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;
const MAX_DESCRIPTION_LENGTH = 100;

export const LabelNameUtils = {
  /**
   * Parses a string into a LabelName.
   * @throws {Error} If the name is empty or whitespace-only
   */
  parse(value: string): LabelName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error("Label name cannot be empty");
    }
    return trimmed as LabelName;
  },

  /** Returns true if the value is a valid label name */
  is(value: string): value is LabelName {
    return value.trim().length > 0;
  },
} as const;

/**
 * Normalize a hex color candidate: strip leading #, expand 3-char to 6-char.
 * Used by both parse() and is() to ensure consistent behavior.
 */
function normalizeHexCandidate(value: string): string {
  let normalized = value.replace(/^#/, "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return normalized;
}

export const LabelColorUtils = {
  /**
   * Parses a string into a LabelColor.
   * @throws {Error} If not a valid 6-character hex code
   */
  parse(value: string): LabelColor {
    const normalized = normalizeHexCandidate(value);

    if (!HEX_COLOR_REGEX.test(normalized)) {
      throw new Error(
        `Invalid hex color "${value}". Expected 3 or 6 hex characters (with optional leading #)`,
      );
    }
    return normalized.toLowerCase() as LabelColor;
  },

  /**
   * Returns true if the value can be parsed as a valid hex color.
   * Note: Returns boolean, not a type guard, because the input may not be
   * in canonical form. Use parse() to get a properly branded LabelColor.
   */
  is(value: string): boolean {
    return HEX_COLOR_REGEX.test(normalizeHexCandidate(value));
  },
} as const;

export const LabelDescriptionUtils = {
  /**
   * Parses a string into a LabelDescription.
   * @throws {Error} If longer than 100 characters
   */
  parse(value: string): LabelDescription {
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(
        `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters (got ${value.length})`,
      );
    }
    return value as LabelDescription;
  },

  /** Returns true if the value is a valid description */
  is(value: string): value is LabelDescription {
    return value.length <= MAX_DESCRIPTION_LENGTH;
  },
} as const;

// Label Definition

/**
 * A label definition for GitHub repository label sync.
 *
 * @see {@link https://docs.github.com/en/rest/issues/labels GitHub Labels API}
 */
export interface Label {
  /**
   * The name of the label.
   *
   * Emoji can be added using either native emoji or colon-style markup.
   * For example, typing `:strawberry:` will render the emoji 🍓.
   */
  name: LabelName;

  /** Hexadecimal color code without the leading `#`. */
  color?: LabelColor;

  /** A short description of the label (max 100 characters). */
  description?: LabelDescription;

  /**
   * Old label names that should be renamed to this label.
   *
   * When syncing, any existing label matching an alias will be renamed,
   * preserving all issue associations.
   */
  aliases?: LabelName[];
}

/**
 * Label configuration file contents.
 */
export interface LabelConfig {
  /** Labels to create or update */
  labels: Label[];

  /** Label names to delete from the repository */
  delete?: LabelName[];
}

// Config Parser (runtime validation)

/** Raw JSON input before validation */
export interface RawLabelConfig {
  labels?: unknown;
  delete?: unknown;
}

/**
 * Parses and validates raw JSON into a type-safe LabelConfig.
 * @throws {Error} With descriptive message if validation fails
 */
export function parseLabelConfig(raw: RawLabelConfig): LabelConfig {
  if (!Array.isArray(raw.labels)) {
    throw new Error("'labels' must be an array");
  }

  const labels: Label[] = raw.labels.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`labels[${index}] must be an object`);
    }

    const rawLabel = item as Record<string, unknown>;

    if (typeof rawLabel.name !== "string") {
      throw new Error(`labels[${index}].name must be a string`);
    }

    const label: Label = {
      name: LabelNameUtils.parse(rawLabel.name),
    };

    if (rawLabel.color !== undefined) {
      if (typeof rawLabel.color !== "string") {
        throw new Error(`labels[${index}].color must be a string`);
      }
      label.color = LabelColorUtils.parse(rawLabel.color);
    }

    if (rawLabel.description !== undefined) {
      if (typeof rawLabel.description !== "string") {
        throw new Error(`labels[${index}].description must be a string`);
      }
      label.description = LabelDescriptionUtils.parse(rawLabel.description);
    }

    if (rawLabel.aliases !== undefined) {
      if (!Array.isArray(rawLabel.aliases)) {
        throw new Error(`labels[${index}].aliases must be an array`);
      }
      label.aliases = rawLabel.aliases.map((alias, aliasIndex) => {
        if (typeof alias !== "string") {
          throw new Error(
            `labels[${index}].aliases[${aliasIndex}] must be a string`,
          );
        }
        return LabelNameUtils.parse(alias);
      });
    }

    return label;
  });

  const result: LabelConfig = { labels };

  if (raw.delete !== undefined) {
    if (!Array.isArray(raw.delete)) {
      throw new Error("'delete' must be an array");
    }
    result.delete = raw.delete.map((name, index) => {
      if (typeof name !== "string") {
        throw new Error(`delete[${index}] must be a string`);
      }
      return LabelNameUtils.parse(name);
    });
  }

  return result;
}

// Builder Pattern (for ergonomic construction)

/**
 * Fluent builder for creating type-safe labels.
 *
 * @example
 * ```ts
 * const bug = label("bug")
 *   .color("ff0000")
 *   .description("Something isn't working")
 *   .aliases("old-bug", "legacy-bug")
 *   .build();
 * ```
 */
export function label(name: string) {
  const _name = LabelNameUtils.parse(name);
  let _color: LabelColor | undefined;
  let _description: LabelDescription | undefined;
  let _aliases: LabelName[] | undefined;

  return {
    color<T extends string>(
      value: T extends ValidateHex<T> ? T : ValidateHex<T>,
    ) {
      _color = LabelColorUtils.parse(value as string);
      return this;
    },
    description(value: string) {
      _description = LabelDescriptionUtils.parse(value);
      return this;
    },
    aliases(...values: string[]) {
      _aliases = values.map(LabelNameUtils.parse);
      return this;
    },
    build(): Label {
      return {
        name: _name,
        ..._color && { color: _color },
        ..._description && { description: _description },
        ..._aliases && { aliases: _aliases },
      };
    },
  };
}

// Default Export

// Default Export
//
// NOTE: The original file contained `declare const contents: LabelConfig;` and `export default contents;`.
// These are "ambient declarations" used in .d.ts files to describe code that exists elsewhere (like a global variable).
// Since this is now a regular .ts file that *implements* the logic, we don't need to declare that it exists elsewhere.
// We just export the types and functions defined above.
