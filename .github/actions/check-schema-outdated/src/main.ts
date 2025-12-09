import { readFileSync } from "fs";
import { generateSchema } from "./generateSchema.ts";
import { checkSchemaDiff } from "./checkSchemaDiff.ts";
import { codeFence } from "./codeFence.ts";
import {
  getInput,
  setFailed,
  setOutput,
  summary,
  toPlatformPath,
} from "@actions/core";
import { context } from "@actions/github";

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

  // Get commit hash from GitHub context (set by GITHUB_SHA env var)
  const commitHash = context.sha || "";
  setOutput("commit-hash", commitHash);

  // Build permalink if we have the required context
  const serverUrl = context.serverUrl || "https://github.com";
  let permalink = "";
  try {
    const { owner, repo } = context.repo;
    if (commitHash && owner && repo) {
      permalink =
        `${serverUrl}/${owner}/${repo}/blob/${commitHash}/${schemafile}`;
    }
  } catch {
    // context.repo throws if GITHUB_REPOSITORY is not set
  }

  const denoExitCode = await generateSchema();

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

  // Format file display - link if permalink available, otherwise just filename
  const fileDisplay = permalink
    ? `[\`${schemafile}\`](${permalink})`
    : `\`${schemafile}\``;

  if (!outdated) {
    summary.addHeading(":white_check_mark: Schema is up-to-date", 3);
  } else {
    summary
      .addHeading(":x: Schema is out-of-date", 3)
      .addEOL()
      .addRaw(`**File:** ${fileDisplay}`, true)
      .addEOL()
      .addDetails("View diff", codeFence("diff", diff, 2))
      .addQuote("<b>Run <code>deno task schema</code> locally to update.</b>")
      .addEOL();

    const fileContent = readFile(schemafile, "utf-8").trim();
    summary.addDetails(
      "View generated schema",
      codeFence("json", fileContent, 2),
    );
    setFailed("Schema needs updating. Run `deno task schema` locally.");
  }

  await summary.write();
}
