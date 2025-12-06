/**
 * Generate JSON Schema from TypeScript types
 * @module
 */

import { generateSchema, OUTPUT_PATH } from "./schema.ts";

const schema = generateSchema();

// Write schema
const content = `${JSON.stringify(schema, null, 2)}\n`;
await Deno.writeTextFile(OUTPUT_PATH, content);

console.log(`Generated ${OUTPUT_PATH}`);
