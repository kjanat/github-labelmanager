import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { PullRequestEvent, PushEvent } from "@octokit/webhooks-types";
import { readFileSync as fsReadFileSync } from "node:fs";

import { findPrForPush, upsertComment } from "./comment.ts";
import {
  buildCommentBody,
  buildStepSummary,
  formatLogOutput,
} from "./format.ts";
import type { ActionInputs, OutputMetadata, RunResult } from "./types.ts";

/** Type for readFileSync function (for dependency injection in tests) */
export type ReadFileFn = (path: string, encoding: BufferEncoding) => string;

/**
 * Get inputs from action.yml
 */
export function getInputs(): ActionInputs {
  return {
    githubToken: core.getInput("github-token", { required: true }),
    outputFile: core.getInput("output-file") || "output.json",
    commentIdentifier: core.getInput("comment-identifier") ||
      "## pkg-pr-new publish",
  };
}

/**
 * Load and parse the pkg-pr-new output file
 */
export function loadOutputFile(
  filePath: string,
  readFile: ReadFileFn = fsReadFileSync,
): OutputMetadata {
  const content = readFile(filePath, "utf8");
  return JSON.parse(content) as OutputMetadata;
}

/**
 * Get the commit SHA based on event type
 */
export function getCommitSha(): string {
  if (context.eventName === "pull_request") {
    const payload = context.payload as PullRequestEvent;
    return payload.pull_request.head.sha;
  }
  if (context.eventName === "push") {
    const payload = context.payload as PushEvent;
    return payload.after;
  }
  throw new Error(`Unsupported event type: ${context.eventName}`);
}

/**
 * Build the commit URL
 */
export function buildCommitUrl(sha: string): string {
  return `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${sha}`;
}

/**
 * Main run logic
 * @param readFile - Optional readFile function for testing (defaults to fs.readFileSync)
 */
export async function run(
  readFile: ReadFileFn = fsReadFileSync,
): Promise<RunResult> {
  const inputs = getInputs();
  const octokit = getOctokit(inputs.githubToken);
  const ctx = { owner: context.repo.owner, repo: context.repo.repo };

  // Load output file
  core.info(`Loading output file: ${inputs.outputFile}`);
  const output = loadOutputFile(inputs.outputFile, readFile);
  core.info(
    `Found ${output.packages.length} packages, ${output.templates.length} templates`,
  );

  // Get commit info
  const sha = getCommitSha();
  const commitUrl = buildCommitUrl(sha);
  core.info(`Commit: ${sha}`);

  // Build comment body
  const body = buildCommentBody(output, commitUrl, inputs.commentIdentifier);

  // Find PR number
  let prNumber: number | null = null;

  if (context.eventName === "pull_request") {
    prNumber = context.issue.number;
  } else if (context.eventName === "push") {
    core.info("Push event - searching for associated PR...");
    prNumber = await findPrForPush(octokit, ctx, context.ref);
    if (prNumber) {
      core.info(`Found PR #${prNumber}`);
    } else {
      core.info("No open PR found for this branch");
    }
  }

  // Result to return
  const result: RunResult = { prFound: prNumber !== null };

  // Post comment if PR found
  if (prNumber) {
    core.info(`Posting comment to PR #${prNumber}...`);
    const commentResult = await upsertComment(
      octokit,
      ctx,
      prNumber,
      body,
      inputs.commentIdentifier,
    );
    result.commentId = commentResult.commentId;
    result.commentUrl = commentResult.commentUrl;
    core.info(`Comment posted: ${commentResult.commentUrl}`);
  } else {
    // Log to console if no PR
    core.info(formatLogOutput(output, commitUrl));
  }

  // Write step summary
  const summary = buildStepSummary(output, commitUrl, result.prFound);
  await core.summary.addRaw(summary).write();

  // Set outputs
  core.setOutput("pr-found", result.prFound.toString());
  core.setOutput("comment-id", result.commentId?.toString() ?? "");
  core.setOutput("comment-url", result.commentUrl ?? "");

  return result;
}
