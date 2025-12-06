/**
 * Shared schema generation logic
 * @module
 */

import { type Config, createGenerator } from "ts-json-schema-generator";

const REPO = "kjanat/github-labelmanager";
export const OUTPUT_PATH = ".github/labels.schema.json";
export const SCHEMA_ID =
  `https://raw.githubusercontent.com/${REPO}/master/${OUTPUT_PATH}`;

const generatorConfig: Config = {
  path: "src/types.ts",
  type: "LabelConfig",
  tsconfig: "deno.json",
  additionalProperties: false,
  skipTypeCheck: true,
};

/**
 * Generate the JSON schema for LabelConfig.
 * Excludes runtime-only _meta property.
 */
export function generateSchema(): Record<string, unknown> {
  const generator = createGenerator(generatorConfig);
  const schema = generator.createSchema(generatorConfig.type);

  // Set $id for remote reference
  schema.$id = SCHEMA_ID;

  // Remove runtime-only _meta property (not part of YAML schema)
  // These are added at runtime by loadConfig() for source line annotations
  if (schema.definitions?.LabelConfig) {
    const labelConfig = schema.definitions.LabelConfig as Record<
      string,
      unknown
    >;
    const props = labelConfig.properties as Record<string, unknown>;
    if (props?._meta) {
      delete props._meta;
    }
    // No error if _meta missing - schema generator output may vary
  }
  if (schema.definitions?.LabelConfigMeta) {
    delete schema.definitions.LabelConfigMeta;
  }

  return schema as Record<string, unknown>;
}
