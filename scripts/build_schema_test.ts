/**
 * Tests for schema generation
 * @module
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { generateSchema, OUTPUT_PATH, SCHEMA_ID } from "./schema.ts";

async function loadCommittedSchema(): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(OUTPUT_PATH);
  return JSON.parse(content);
}

// --- Schema structure tests ---

Deno.test("schema - has required $id property", async () => {
  const schema = await loadCommittedSchema();
  assertEquals(schema.$id, SCHEMA_ID);
});

Deno.test("schema - uses draft-07", async () => {
  const schema = await loadCommittedSchema();
  assertEquals(schema.$schema, "http://json-schema.org/draft-07/schema#");
});

Deno.test("schema - defines LabelConfig", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<string, unknown>;
  assertExists(definitions);
  assertExists(definitions.LabelConfig);
});

Deno.test("schema - defines LabelDefinition", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<string, unknown>;
  assertExists(definitions);
  assertExists(definitions.LabelDefinition);
});

Deno.test("schema - LabelDefinition has color pattern", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;
  const labelDef = definitions.LabelDefinition;
  const properties = labelDef.properties as Record<
    string,
    Record<string, unknown>
  >;

  assertExists(properties.color);
  assertEquals(properties.color.pattern, "^#?[0-9A-Fa-f]{6}$");
});

Deno.test("schema - LabelDefinition has correct required fields", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;
  const labelDef = definitions.LabelDefinition;
  const required = labelDef.required as string[];

  assertEquals(required.includes("name"), true);
  assertEquals(required.includes("color"), true);
  assertEquals(required.includes("description"), true);
  assertEquals(required.includes("aliases"), false);
});

Deno.test("schema - LabelConfig has labels as required", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;
  const labelConfig = definitions.LabelConfig;
  const required = labelConfig.required as string[];

  assertEquals(required.includes("labels"), true);
  assertEquals(required.includes("delete"), false);
});

Deno.test("schema - disallows additional properties", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;

  assertEquals(definitions.LabelConfig.additionalProperties, false);
  assertEquals(definitions.LabelDefinition.additionalProperties, false);
});

// --- Schema sync tests ---

Deno.test("schema - committed schema matches generated schema", async () => {
  const committed = await loadCommittedSchema();
  const generated = generateSchema();

  // Compare as JSON strings to get a clean diff
  const committedJson = JSON.stringify(committed, null, 2);
  const generatedJson = JSON.stringify(generated, null, 2);

  assertEquals(
    committedJson,
    generatedJson,
    "Committed schema is out of sync with types. Run: deno task schema",
  );
});

// --- Schema content tests ---

Deno.test("schema - has descriptions from JSDoc", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;

  // Check root description
  assertStringIncludes(
    definitions.LabelConfig.description as string,
    "Root configuration schema",
  );

  // Check label definition
  assertStringIncludes(
    definitions.LabelDefinition.description as string,
    "Label definition",
  );

  // Check property descriptions
  const props = definitions.LabelDefinition.properties as Record<
    string,
    Record<string, unknown>
  >;
  assertStringIncludes(props.name.description as string, "name of the label");
  assertStringIncludes(props.color.description as string, "hex code");
});

Deno.test("schema - aliases is optional array of strings", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;
  const labelDef = definitions.LabelDefinition;
  const properties = labelDef.properties as Record<
    string,
    Record<string, unknown>
  >;

  assertExists(properties.aliases);
  assertEquals(properties.aliases.type, "array");

  const items = properties.aliases.items as Record<string, unknown>;
  assertEquals(items.type, "string");
});

Deno.test("schema - delete is optional array of strings", async () => {
  const schema = await loadCommittedSchema();
  const definitions = schema.definitions as Record<
    string,
    Record<string, unknown>
  >;
  const labelConfig = definitions.LabelConfig;
  const properties = labelConfig.properties as Record<
    string,
    Record<string, unknown>
  >;

  assertExists(properties.delete);
  assertEquals(properties.delete.type, "array");

  const items = properties.delete.items as Record<string, unknown>;
  assertEquals(items.type, "string");
});
