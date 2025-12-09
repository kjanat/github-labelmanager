#!/usr/bin/env -S deno run -A

/**
 * Generate JSON Schema from TypeScript types
 * @module
 */

import { z } from "zod";
import { labelConfigSchema } from "~/schema.ts";
import { type JsonValue, sortSchema } from "./sort-schema.ts";

export const GIT_BRANCH = "master";
export const GIT_REPO = "kjanat/github-labelmanager";
export const OUTPUT_PATH = ".github/labels.schema.json";

export const DEFAULT_SCHEMA_ID =
  `https://raw.githubusercontent.com/${GIT_REPO}/${GIT_BRANCH}/${OUTPUT_PATH}`;

/**
 * Generate JSON Schema from Zod definition
 */
export function generateSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(labelConfigSchema, {
    target: "draft-7",
    override: (ctx) => {
      // Remove _meta from output (runtime-only)
      const props = ctx.jsonSchema.properties as
        | Record<string, unknown>
        | undefined;
      if (props?._meta) {
        delete props._meta;
      }
    },
  });

  // Add $id and description to the root schema
  (schema as Record<string, unknown>).$id = DEFAULT_SCHEMA_ID;
  (schema as Record<string, unknown>).description =
    `Schema for declaratively managing GitHub issue labels via ${GIT_REPO}.`;

  // Sort keys for consistent output (matches committed schema)
  return sortSchema(schema as JsonValue) as Record<string, unknown>;
}

if (import.meta.main) {
  try {
    const schema = generateSchema();
    const content = `${JSON.stringify(schema, null, 2)}\n`;
    await Deno.writeTextFile(OUTPUT_PATH, content);
    console.log(`Generated ${OUTPUT_PATH}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Failed to generate schema: ${err.message}`);
      console.error(err.stack);
    } else {
      console.error(`Failed to generate schema: ${err}`);
    }
    Deno.exit(1);
  }
}
