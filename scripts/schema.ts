/**
 * Generate JSON Schema from Zod definitions
 * @module
 */
import { z } from "zod";
import { labelConfig } from "@/schema.ts";

export const OUTPUT_PATH = ".github/labels.schema.json";
export const SCHEMA_ID =
  "https://raw.githubusercontent.com/kjanat/github-labelmanager/master/.github/labels.schema.json";

export function generateSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(labelConfig, {
    target: "draft-2020-12",
    reused: "ref", // Extract shared defs to $defs
    cycles: "ref",
    unrepresentable: "any", // _meta has Record types
    override: (ctx) => {
      // Add uniqueItems to arrays (not natively supported by Zod)
      if (ctx.zodSchema === labelConfig.shape.labels) {
        ctx.jsonSchema.uniqueItems = true;
      }
      if (ctx.zodSchema === labelConfig.shape.delete) {
        ctx.jsonSchema.uniqueItems = true;
      }
      // Remove _meta from output (runtime-only)
      const props = ctx.jsonSchema.properties as
        | Record<string, unknown>
        | undefined;
      if (props?._meta) {
        delete props._meta;
      }
    },
  }) as Record<string, unknown>;

  // Add schema metadata
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: SCHEMA_ID,
    title: "GitHub Label Manager Configuration",
    description:
      "Schema for declaratively managing GitHub issue labels via kjanat/github-labelmanager.",
    ...schema,
    examples: [{
      labels: [
        {
          name: "bug",
          color: "#d73a4a",
          description: "Something isn't working",
        },
        {
          name: "feature",
          color: "#a2eeef",
          description: "New feature",
          aliases: ["enhancement"],
        },
        {
          name: "docs",
          color: "#0075ca",
          description: "Documentation improvements",
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
  };
}
