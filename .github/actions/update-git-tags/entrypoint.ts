#!/usr/bin/env bun

/**
 * Update Git Tags - Tag and push releases with major/minor version tracking
 *
 * Source: https://github.com/actions/typescript-action/blob/eda541612e5f5293a585e778a04fec6a219ab4e4/script/release
 *
 * This script will do the following:
 *
 * 1. Retrieve the latest release tag
 * 2. Display the latest release tag
 * 3. Prompt the user for a new release tag (CLI mode) or use INPUT_TAG (CI mode)
 * 4. Validate the new release tag
 * 5. Validate version file (package.json, deno.json, jsr.json) if present
 * 6. Tag a new release
 * 7. Set 'is_major_release' variable
 * 8. Point separate major release tag (e.g. v1, v2) to the new release
 * 9. Point separate minor release tag (e.g. v1.2) to the new release (if enabled)
 * 10. Push the new tags (with commits, if any) to remote
 * 11. If this is a major release, create a 'releases/v#' branch and push (if enabled)
 *
 * Modes:
 *
 * - CI mode: Uses INPUT_* env vars from action.yml (when GITHUB_ACTIONS=true)
 * - CLI mode: Interactive prompts when GITHUB_ACTIONS is unset
 *
 * Usage:
 *
 * CLI: bun run entrypoint.ts
 * CI:  Runs automatically via action.yml
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as readline from "node:readline";
import { parseArgs as utilParseArgs } from "node:util";
import process from "node:process";
import stripJsonComments from "strip-json-comments";

// === Mode Detection ===
const CI_MODE = process.env.GITHUB_ACTIONS === "true";

// === Terminal Colors (disabled in CI) ===
const colors = CI_MODE
  ? { off: "", red: "", green: "", blue: "", purple: "", bold: "" }
  : {
    off: "\x1b[0m",
    red: "\x1b[1;31m",
    green: "\x1b[1;32m",
    blue: "\x1b[1;34m",
    purple: "\x1b[1;35m",
    bold: "\x1b[1m",
  };

// === Logging Helpers ===
function log(msg: string): void {
  console.log(msg);
}

function error(msg: string): never {
  if (CI_MODE) {
    console.log(`::error::${msg}`);
  } else {
    console.error(`${colors.red}Error: ${msg}${colors.off}`);
  }
  process.exit(1);
}

function warn(msg: string): void {
  if (CI_MODE) {
    console.log(`::warning::${msg}`);
  } else {
    console.log(`${colors.purple}Warning: ${msg}${colors.off}`);
  }
}

function notice(msg: string): void {
  if (CI_MODE) {
    console.log(`::notice::${msg}`);
  } else {
    console.log(`${colors.blue}Notice: ${msg}${colors.off}`);
  }
}

function output(name: string, value: string): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

// === Git Helpers ===
function git(
  ...args: string[]
): { stdout: string; stderr: string; success: boolean } {
  const result = spawnSync("git", args, { encoding: "utf-8" });
  return {
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    success: result.status === 0,
  };
}

function gitOrFail(...args: string[]): string {
  const result = git(...args);
  if (!result.success) {
    const msg = result.stderr ? `: ${result.stderr}` : "";
    error(`git ${args.join(" ")} failed${msg}`);
  }
  return result.stdout;
}

// === Input Handling ===
function getInput(name: string, defaultValue: string = ""): string {
  const envName = `INPUT_${name.toUpperCase().replace(/-/g, "_")}`;
  return process.env[envName] ?? defaultValue;
}

// === Version File Detection ===
function findVersionFile(specified: string): string | null {
  if (specified === "auto" || specified === "") {
    // Priority: package.json > deno.json > deno.jsonc > jsr.json > jsr.jsonc
    for (
      const file of [
        "package.json",
        "deno.json",
        "deno.jsonc",
        "jsr.json",
        "jsr.jsonc",
      ]
    ) {
      if (existsSync(file)) return file;
    }
    return null;
  } else if (specified === "none" || specified === "skip") {
    return null;
  } else {
    if (existsSync(specified)) return specified;
    error(`Version file not found: ${specified}`);
  }
}

// === Version File Validation ===
function validateVersionFile(tag: string, file: string): void {
  let content = readFileSync(file, "utf-8");

  // Strip comments for jsonc files using proper parser
  if (file.endsWith(".jsonc")) {
    content = stripJsonComments(content);
  }

  let fileVersion: string | undefined;
  try {
    const json = JSON.parse(content);
    fileVersion = json.version;
  } catch {
    error(`Failed to parse ${file}`);
  }

  if (!fileVersion) {
    warn(`No version field in ${file}, skipping validation`);
    return;
  }

  const tagVersion = tag.replace(/^v/, "");
  if (tagVersion !== fileVersion) {
    error(`Version mismatch: tag=${tagVersion}, ${file}=${fileVersion}`);
  }

  log(
    `Version validated: ${colors.green}${tagVersion}${colors.off} matches ${file}`,
  );
}

// === Prerelease Detection ===
function isPrerelease(tag: string): boolean {
  return tag.includes("-");
}

// === Prompt Helper ===
async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return await new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// === Help ===
function printHelp(): never {
  console.log(
    `Update Git Tags - Tag and push releases with major/minor version tracking

USAGE:
  bun run entrypoint.ts [OPTIONS]
  bun run entrypoint.ts --help

OPTIONS:
  -h, --help              Show this help message
  -t, --tag TAG           Version tag to process (e.g., v1.2.3)
  -M, --major             Update major version tag (default: true)
  --no-major              Do not update major version tag
  -m, --minor             Update minor version tag (default: false)
  -b, --create-branch     Create releases/vX branch for major releases
  -f, --version-file FILE Path to version file (auto|none|path)

ENVIRONMENT VARIABLES (CI mode):
  INPUT_TAG               Version tag (required in CI)
  INPUT_MAJOR             Update major tag (true/false)
  INPUT_MINOR             Update minor tag (true/false)
  INPUT_CREATE_BRANCH     Create release branch (true/false)
  INPUT_VERSION_FILE      Version file path (auto/none/path)

EXAMPLES:
  # Interactive mode
  bun run entrypoint.ts

  # With arguments
  bun run entrypoint.ts --tag v1.2.3 --minor

  # Skip version file validation
  bun run entrypoint.ts --tag v1.0.0 --version-file none

  # CI mode (via GitHub Actions)
  INPUT_TAG=v1.2.3 INPUT_MINOR=true bun run entrypoint.ts`,
  );
  process.exit(0);
}

// === Argument Parsing ===
function parseCliArgs(): void {
  const { values } = utilParseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
      tag: { type: "string", short: "t" },
      major: { type: "boolean", short: "M", default: true },
      "no-major": { type: "boolean", default: false },
      minor: { type: "boolean", short: "m", default: false },
      "create-branch": { type: "boolean", short: "b", default: false },
      "version-file": { type: "string", short: "f", default: "auto" },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
  }

  // Map parsed values to INPUT_* env vars (CI convention)
  if (values.tag) {
    process.env.INPUT_TAG = values.tag;
  }
  if (values["no-major"]) {
    process.env.INPUT_MAJOR = "false";
  } else if (values.major) {
    process.env.INPUT_MAJOR = "true";
  }
  if (values.minor) {
    process.env.INPUT_MINOR = "true";
  }
  if (values["create-branch"]) {
    process.env.INPUT_CREATE_BRANCH = "true";
  }
  if (values["version-file"]) {
    process.env.INPUT_VERSION_FILE = values["version-file"];
  }
}

// === Main ===
async function main(): Promise<void> {
  // Parse CLI arguments if not in CI mode
  if (!CI_MODE) {
    parseCliArgs();
  }

  // Get inputs
  let tag = getInput("TAG");
  let major = getInput("MAJOR", "true") === "true";
  let minor = getInput("MINOR", "false") === "true";
  const createBranch = getInput("CREATE_BRANCH", "false") === "true";
  const versionFileInput = getInput("VERSION_FILE", "auto");

  // Semver regex
  const semverTagRegex = /^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/;
  const semverTagGlob = "v[0-9]*.[0-9]*.[0-9]*";

  // Interactive fallback for TAG (CLI mode only)
  if (!tag) {
    if (CI_MODE) {
      error("tag input is required");
    }

    // Get latest tag for reference
    const latestResult = git(
      "describe",
      "--abbrev=0",
      `--match=${semverTagGlob}`,
    );
    if (latestResult.success) {
      log(
        `Latest release tag: ${colors.blue}${latestResult.stdout}${colors.off}`,
      );
    } else {
      log("No existing release tags found");
    }

    tag = await prompt("Enter new release tag (vX.X.X format): ");
  }

  // Validate tag format
  if (!semverTagRegex.test(tag)) {
    error(`Invalid tag format: ${tag} (must be vX.X.X or vX.X.X-prerelease)`);
  }

  log(`Processing tag: ${colors.blue}${tag}${colors.off}`);

  // Check for prerelease
  if (isPrerelease(tag)) {
    notice(`Prerelease ${tag}: major/minor tags will not be updated`);
    major = false;
    minor = false;
  }

  // Version file validation
  const versionFile = findVersionFile(versionFileInput);
  if (versionFile) {
    validateVersionFile(tag, versionFile);
  } else if (versionFileInput !== "none" && versionFileInput !== "skip") {
    warn("No version file found, skipping validation");
  }

  // Interactive confirmation (CLI mode only)
  if (!CI_MODE) {
    const confirm = await prompt(
      `Continue with tag ${colors.blue}${tag}${colors.off}? [Y/n] `,
    );
    if (confirm.toLowerCase() === "n") {
      log("Aborted");
      process.exit(0);
    }
  }

  // Extract version components
  // v1.2.3 -> majorTag=v1, minorTag=v1.2
  const majorTag = tag.split(".")[0]; // v1
  let minorTag = tag.split(".").slice(0, 2).join("."); // v1.2
  minorTag = minorTag.split("-")[0]; // Strip prerelease suffix

  // Determine if this is a major release (new major version)
  let isMajorRelease = false;
  let firstRelease = false;
  let latestMajor = "";

  const latestResult = git(
    "describe",
    "--abbrev=0",
    `--match=${semverTagGlob}`,
  );
  if (latestResult.success) {
    latestMajor = latestResult.stdout.split(".")[0];
    isMajorRelease = majorTag !== latestMajor;
  } else {
    // First release is always a major release
    isMajorRelease = true;
    firstRelease = true;
  }

  log(`Major release: ${colors.blue}${isMajorRelease}${colors.off}`);

  // Notice for first release or new major version
  if (firstRelease) {
    notice(`First release: ${tag}`);
  } else if (isMajorRelease) {
    notice(`New major version: ${latestMajor} -> ${majorTag}`);
  }

  // Check if tag already exists
  const tagExists = git("rev-parse", tag).success;
  if (tagExists) {
    warn(`Tag ${tag} already exists, skipping tag creation`);
  } else {
    // Create annotated tag
    gitOrFail("tag", tag, "--annotate", "--message", `${tag} Release`);
    log(`Created tag: ${colors.green}${tag}${colors.off}`);
  }

  // Update major tag (e.g., v1)
  if (major) {
    gitOrFail(
      "tag",
      majorTag,
      "--force",
      "--annotate",
      "--message",
      `Sync ${majorTag} with ${tag}`,
    );
    log(`Updated major tag: ${colors.green}${majorTag}${colors.off} -> ${tag}`);
    output("major-tag", majorTag);
  }

  // Update minor tag (e.g., v1.2)
  if (minor) {
    gitOrFail(
      "tag",
      minorTag,
      "--force",
      "--annotate",
      "--message",
      `Sync ${minorTag} with ${tag}`,
    );
    log(`Updated minor tag: ${colors.green}${minorTag}${colors.off} -> ${tag}`);
    output("minor-tag", minorTag);
  }

  // Push tags
  log("Pushing tags to origin...");
  const commitSha = gitOrFail("rev-parse", "--short", "HEAD");

  // Try force-with-lease first, fallback to regular push
  if (!git("push", "origin", tag, "--force-with-lease").success) {
    gitOrFail("push", "origin", tag);
  }

  if (major) {
    gitOrFail("push", "origin", majorTag, "--force");
    notice(`Major tag ${majorTag} moved to ${commitSha}`);
  }

  if (minor) {
    gitOrFail("push", "origin", minorTag, "--force");
    notice(`Minor tag ${minorTag} moved to ${commitSha}`);
  }

  // Create release branch for major releases (optional)
  if (createBranch && isMajorRelease) {
    const branchName = `releases/${majorTag}`;
    const branchExists =
      git("show-ref", "--verify", "--quiet", `refs/heads/${branchName}`)
        .success;

    if (branchExists) {
      warn(`Branch ${branchName} already exists`);
    } else {
      gitOrFail("branch", branchName, tag);
      gitOrFail("push", "--set-upstream", "origin", branchName);
      notice(`Release branch ${branchName} created from ${tag}`);
    }
  }

  // Set outputs
  output("is-major-release", String(isMajorRelease));

  log(`${colors.green}Done!${colors.off}`);
}

main().catch((err) => {
  error(err instanceof Error ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : String(err));
});
