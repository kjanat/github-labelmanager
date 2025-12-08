/**
 * Schema definitions - single source of truth for types and JSON Schema
 * @module
 */
import { z } from "zod";

// === Primitives with constraints ===

export const labelName = z.string()
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

export const hexColor = z.string()
  .regex(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
  .meta({
    title: "Hex Color Code",
    description:
      "Valid CSS hex color code. Supports 3-character (#RGB) or 6-character (#RRGGBB) format. The leading '#' is optional. Case-insensitive.",
    examples: ["#d73a4a", "#a2eeef", "0075ca", "#FFF", "#ffffff", "ABC123"],
  });

export const labelDescription = z.string()
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

// === Label Definition ===

export const labelDefinition = z.strictObject({
  name: labelName,
  color: hexColor,
  description: labelDescription,
  aliases: z.array(labelName).min(1).optional().meta({
    title: "Label Aliases (for Renaming)",
    description:
      "Array of old label names that should be renamed to this label's name. When syncing, any existing label matching an alias will be renamed, preserving all issue associations. Useful for standardizing label names across repositories.",
    examples: [["enhancement"], ["documentation", "docs-update"], [
      "priority-high",
      "urgent",
      "P1",
    ]],
  }),
}).meta({
  title: "Label Definition",
  description:
    "A GitHub issue label with name, color, description, and optional aliases for renaming.",
});

// === Config Metadata (runtime only, excluded from schema output) ===

export const labelConfigMeta = z.object({
  filePath: z.string(),
  labelLines: z.record(z.string(), z.number()),
  deleteLines: z.record(z.string(), z.number()),
});

// === Root Config ===

export const labelConfig = z.strictObject({
  labels: z.array(labelDefinition).meta({
    title: "Labels to Create or Update",
    description:
      "Array of label definitions. Each label will be created if it doesn't exist, or updated if it does. Use 'aliases' to rename existing labels while preserving issue associations.",
  }),
  delete: z.array(labelName).optional().meta({
    title: "Labels to Delete",
    description:
      "Array of label names to remove from the repository. Use with caution: deleted labels will be removed from all issues. Labels listed here should NOT also appear in the 'labels' array.",
    examples: [["obsolete-label", "deprecated", "wontfix"]],
  }),
  _meta: labelConfigMeta.optional(),
});

// === Inferred Types ===

export type LabelName = z.infer<typeof labelName>;
export type HexColor = z.infer<typeof hexColor>;
export type LabelDescription = z.infer<typeof labelDescription>;
export type LabelDefinition = z.infer<typeof labelDefinition>;
export type LabelConfigMeta = z.infer<typeof labelConfigMeta>;
export type LabelConfig = z.infer<typeof labelConfig>;
