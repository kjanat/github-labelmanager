/**
 * Tests for schema generation
 * @module
 */

import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import {
  DEFAULT_SCHEMA_ID,
  generateSchema,
  OUTPUT_PATH,
} from "$/scripts/build_schema.ts";

async function loadCommittedSchema(): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(OUTPUT_PATH);
  return JSON.parse(content);
}

function resolveRoot(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.$ref) {
    const ref = schema.$ref as string;
    const refName = ref.split("/").pop() as string;
    const defs = (schema.definitions || schema.$defs) as Record<
      string,
      unknown
    >;
    return defs[refName] as Record<string, unknown>;
  }
  return schema;
}

// --- Schema structure tests ---

Deno.test("schema - has required $id property", async () => {
  const schema = await loadCommittedSchema();
  assertEquals(schema.$id, DEFAULT_SCHEMA_ID);
});

Deno.test("schema - uses draft 07", async () => {
  const schema = await loadCommittedSchema();
  assertEquals(schema.$schema, "http://json-schema.org/draft-07/schema#");
});

function getLabelDefinition(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const labels = (schema.properties as Record<string, unknown>)
    .labels as Record<string, unknown>;
  const items = labels.items as Record<string, unknown>;

  if (items.$ref && typeof items.$ref === "string") {
    const ref = items.$ref as string;
    const refName = ref.split("/").pop() as string;
    const defs = schema.$defs as Record<string, Record<string, unknown>>;
    assertExists(defs, "$defs should exist");
    const resolved = defs[refName];
    assertExists(resolved, `Expected ${refName} in $defs`);
    return resolved;
  }

  return items;
}

Deno.test("schema - LabelDefinition has correct structure", async () => {
  const root = await loadCommittedSchema();
  const schema = resolveRoot(root);
  const labelDef = getLabelDefinition(schema);

  // Check required fields
  const required = labelDef.required as string[];
  assertEquals(required.sort(), ["name"]);

  // Check properties
  const props = labelDef.properties as Record<string, unknown>;
  assertExists(props.name);
  assertExists(props.color);
  assertExists(props.description);

  // Zod specific: aliases is optional
  assertExists(props.aliases);

  // Check no additional properties
  assertEquals(labelDef.additionalProperties, false);
});

Deno.test("schema - LabelDefinition has color pattern", async () => {
  const root = await loadCommittedSchema();
  const schema = resolveRoot(root);
  const labelDef = getLabelDefinition(schema);

  // Access the color definition directly or via ref depending on how Zod structured it
  // In our Zod schema, hexColor is a shared const but might be inline or ref
  // Let's inspect the property directly on LabelDefinition
  const props = labelDef.properties as Record<string, unknown>;
  const colorProp = props.color as Record<string, unknown>;

  // Zod toJSONSchema usually puts the pattern directly
  // hexColor regex: /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  assertExists(colorProp.pattern);
  assertEquals(colorProp.pattern, "^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$");
});

Deno.test("schema - Root object has correct structure", async () => {
  const root = await loadCommittedSchema();
  const schema = resolveRoot(root);
  const props = schema.properties as Record<string, Record<string, unknown>>;

  assertExists(props.labels);
  assertExists(props.delete);

  // Check required
  const required = schema.required as string[];
  assertArrayIncludes(required, ["labels"]);

  // Check uniqueItems (not enforced by Zod schema)
  // assertEquals(props.labels.uniqueItems, true);
  // assertEquals(props.delete.uniqueItems, true);
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

Deno.test("schema - has descriptions from metadata", async () => {
  const root = await loadCommittedSchema();
  const schema = resolveRoot(root);

  // Root description
  assertStringIncludes(
    root.description as string,
    "github-labelmanager",
  );

  // LabelDefinition description
  const labelDef = getLabelDefinition(schema);
  assertStringIncludes(
    labelDef.description as string,
    "GitHub issue label",
  );

  // Field descriptions (name and color share LabelName/HexColor metadata)
  const defs = (root.$defs || root.definitions) as Record<
    string,
    Record<string, unknown>
  >;
  const props = labelDef.properties as Record<string, Record<string, unknown>>;

  // name -> ref to LabelName (__schema0)
  const nameRef = props.name.$ref as string | undefined;
  if (nameRef) {
    const refName = nameRef.split("/").pop() as string;
    assertExists(defs[refName]);
    assertExists(defs[refName].description);
  }

  // color has inline description
  assertExists(props.color.description, "color description should exist");
});
