/**
 * Schema definitions - single source of truth for types and JSON Schema
 * @module
 */
import { z } from "zod";
import {
  type Label as ModelLabel,
  type LabelColor,
  LabelColorUtils,
  type LabelConfig as ModelLabelConfig,
  type LabelDescription,
  LabelDescriptionUtils,
  type LabelName,
  LabelNameUtils,
} from "~/domain/labels.ts";

// Re-export types from model
export type { LabelColor, LabelDescription, LabelName };
export type HexColor = LabelColor; // Alias for backward compatibility if needed
export type LabelDefinition = ModelLabel;

// === Primitives with constraints (Base schemas for JSON generation) ===

export const labelNameBase: z.ZodString = z.string()
  .min(1).max(50)
  .regex(/^(?!\s).*(?<!\s)$/)
  .meta({
    title: "Label Name",
    description:
      "GitHub label name. Maximum 50 characters. May contain letters, numbers, spaces, hyphens, underscores, colons, and other printable characters. Cannot be empty or consist only of whitespace.",
    examples: [
      "bug",
      "feature",
      "P0: critical",
      "area: ui",
      "good first issue",
    ],
  });

export const hexColorBase: z.ZodString = z.string()
  .regex(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
  .meta({
    title: "Hex Color Code",
    description:
      "Valid CSS hex color code for the label. Supports 3-character (#RGB) or 6-character (#RRGGBB) format. The leading '#' is optional. Case-insensitive.",
    examples: ["#d73a4a", "#a2eeef", "0075ca", "#FFF", "#ffffff", "ABC123"],
  });

export const labelDescriptionBase: z.ZodString = z.string()
  .min(0).max(100)
  .meta({
    title: "Label Description",
    description:
      "GitHub label description. Maximum 100 characters. Should be concise and explain the label's purpose.",
    examples: [
      "Something isn't working",
      "New feature or meaningful behavior change",
    ],
  });

// === Transformed schemas (for runtime validation) ===

export const labelName: z.ZodType<LabelName, string> = labelNameBase.transform((
  val,
) => LabelNameUtils.parse(val));

export const hexColor: z.ZodType<LabelColor, string> = hexColorBase.transform((
  val,
) => LabelColorUtils.parse(val));

export const labelDescription: z.ZodType<LabelDescription, string> =
  labelDescriptionBase.transform((val) => LabelDescriptionUtils.parse(val));

// === Interfaces ===

export interface LabelConfigMeta {
  filePath: string;
  labelLines: Record<string, number>;
  deleteLines: Record<string, number>;
}

// Extend ModelLabelConfig to include _meta
export interface LabelConfig extends ModelLabelConfig {
  _meta?: LabelConfigMeta;
}

// === Label Definition (Schema for Generation) ===

export const labelDefinitionSchema: z.ZodTypeAny = z.strictObject({
  name: labelNameBase.meta({
    title: "Label Name",
    description:
      "The display name of the label. Must be unique within the repository. Supports spaces and special characters. Common patterns include: type labels (bug, feature), priority labels (P0: critical), and area labels (area: ui).",
    examples: [
      "bug",
      "feature",
      "P0: critical",
      "area: ui",
      "good first issue",
    ],
  }),
  color: hexColorBase.optional().meta({
    title: "Label Color",
    description:
      "Hex color code for the label background. Can be 3 or 6 characters, with or without leading '#'. GitHub will normalize to 6-char format without '#'.",
    examples: ["#d73a4a", "#a2eeef", "0075ca", "#FFF", "abc"],
  }),
  description: labelDescriptionBase.optional().meta({
    title: "Label Description",
    description:
      "Short description explaining when to use this label. Displayed in GitHub's label picker and helps contributors understand label purpose.",
    examples: [
      "Something isn't working",
      "New feature or meaningful behavior change",
      "Good for newcomers",
    ],
  }),
  aliases: z.array(labelNameBase).min(1).optional().meta({
    title: "Label Aliases (for Renaming)",
    description:
      "Array of old label names that should be renamed to this label's name. When syncing, any existing label matching an alias will be renamed, preserving all issue associations. Useful for standardizing label names across repositories.",
    examples: [["enhancement"], ["documentation", "docs-update"], [
      "priority-high",
      "urgent",
      "P1",
    ]],
    uniqueItems: true,
  }),
}).meta({
  title: "Label Definition",
  description:
    "A GitHub issue label with name, color, description, and optional aliases for renaming.",
});

// === Label Definition (Runtime) ===

export const labelDefinition: z.ZodTypeAny = z.strictObject({
  name: labelName,
  color: hexColor.optional(),
  description: labelDescription.optional(),
  aliases: z.array(labelName).min(1).describe("aliases").optional(),
}).describe("labelDefinition");

// === Config Metadata (runtime only, excluded from schema output) ===

export const labelConfigMeta: z.ZodTypeAny = z.object({
  filePath: z.string(),
  labelLines: z.record(z.string(), z.number()),
  deleteLines: z.record(z.string(), z.number()),
});

// === Root Config (Schema for Generation) ===

export const labelConfigSchema: z.ZodTypeAny = z.strictObject({
  $schema: z.string().optional(),
  labels: z.array(labelDefinitionSchema).meta({
    title: "Labels to Create or Update",
    description:
      "Array of label definitions. Each label will be created if it doesn't exist, or updated if it does. Use 'aliases' to rename existing labels while preserving issue associations.",
    examples: [[
      { name: "bug", color: "#d73a4a", description: "Something isn't working" },
      {
        name: "feature",
        color: "#a2eeef",
        description: "New feature or request",
        aliases: ["enhancement"],
      },
    ]],
    uniqueItems: true,
  }),
  delete: z.array(labelNameBase).optional().meta({
    title: "Labels to Delete",
    description:
      "Array of label names to remove from the repository. Use with caution: deleted labels will be removed from all issues. Labels listed here should NOT also appear in the 'labels' array.",
    examples: [["obsolete-label", "deprecated", "wontfix"]],
    uniqueItems: true,
  }),
}).meta({
  title: "GitHub Label Manager Configuration",
  description:
    "Schema for declaratively managing GitHub issue labels via kjanat/github-labelmanager.",
  examples: [{
    labels: [
      { name: "bug", color: "#d73a4a", description: "Something isn't working" },
      {
        name: "feature",
        color: "#a2eeef",
        description: "New feature or meaningful behavior change",
        aliases: ["enhancement"],
      },
      {
        name: "docs",
        color: "#0075ca",
        description: "Improvements or additions to documentation",
        aliases: ["documentation"],
      },
      {
        name: "P0: critical",
        color: "#b60205",
        description: "Broken core flows, must fix ASAP",
      },
    ],
    delete: ["dependencies", "javascript", "obsolete-label"],
  }],
});

// === Root Config (Runtime) ===

export const labelConfig: z.ZodType<LabelConfig> = z.strictObject({
  $schema: z.string().optional(),
  labels: z.array(labelDefinition).describe("labels"),
  delete: z.array(labelName).describe("delete").optional(),
  _meta: labelConfigMeta.optional(),
}).describe("labelConfig") as z.ZodType<LabelConfig>;
