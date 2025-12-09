import * as core from "@actions/core";

import { run } from "./run.ts";

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.stack ?? error.message);
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

main();
