/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
import { run } from "./main.ts";

if (import.meta.main) {
  await run();
}

export { run } from "./main.ts";
