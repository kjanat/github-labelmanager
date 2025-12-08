import { readFileSync } from "fs";
import { generateSchema } from "./generateSchema.ts";
import { getCommitHash } from "./getCommitHash.ts";
import { checkSchemaDiff } from "./checkSchemaDiff.ts";
import {
  getInput,
  setFailed,
  setOutput,
  summary,
  toPlatformPath,
} from "@actions/core";

/** Function type for reading file contents */
type ReadFileFn = (path: string, encoding: BufferEncoding) => string;

/** Default file reader using Node.js fs */
/* istanbul ignore next -- @preserve thin wrapper, tested via integration */
const defaultReadFile: ReadFileFn = (path, encoding) =>
  readFileSync(path, encoding);

/**
 * The main function for the action.
 *
 * @param readFile - Function to read file contents (injectable for testing)
 * @returns Resolves when the action is complete.
 */
export async function run(
  readFile: ReadFileFn = defaultReadFile,
): Promise<void> {
  let schemafile = getInput("file", { required: true });
  schemafile = toPlatformPath(schemafile);
  setOutput("file", schemafile);

  const [denoExitCode] = await Promise.all([generateSchema(), getCommitHash()]);

  if (denoExitCode !== 0) {
    setFailed(`Schema generation failed with exit code ${denoExitCode}`);
    return;
  }

  const {
    exitCode: diffExitCode,
    diff,
    error,
  } = await checkSchemaDiff(schemafile);

  if (diffExitCode > 1) {
    setFailed(`Git diff failed with exit code ${diffExitCode}: ${error}`);
    return;
  }

  const outdated = diffExitCode === 1;
  setOutput("outdated", outdated);
  setOutput("up-to-date", !outdated);

  if (!outdated) {
    summary.addHeading(":white_check_mark: Schema is up-to-date", 3);
  } else {
    summary
      .addHeading(":x: Schema is out-of-date", 3)
      .addEOL()
      .addRaw(`**File:** \`${schemafile}\``, true)
      .addEOL()
      .addCodeBlock(diff, "diff")
      .addQuote("<b>Run <code>deno task schema</code> locally to update.</b>");

    const fileContent = readFile(schemafile, "utf-8");
    summary.addDetails(
      "View generated schema",
      `<pre lang="json"><code>${fileContent}</code></pre>`,
    );
    setFailed("Schema needs updating. Run `deno task schema` locally.");
  }

  await summary.write();
}
