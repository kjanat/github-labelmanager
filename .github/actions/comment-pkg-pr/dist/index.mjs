import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { readFileSync } from "node:fs";

//#region src/comment.ts
/**
* Find existing bot comment by identifier string
*/
async function findBotComment(octokit, ctx, issueNumber, identifier) {
	const { data: comments } = await octokit.rest.issues.listComments({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: issueNumber
	});
	const found = comments.find((comment) => comment.body?.includes(identifier));
	if (found) return {
		id: found.id,
		url: found.html_url
	};
	return null;
}
/**
* Create a new comment on an issue/PR
*/
async function createComment(octokit, ctx, issueNumber, body) {
	const { data } = await octokit.rest.issues.createComment({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: issueNumber,
		body
	});
	return {
		commentId: data.id,
		commentUrl: data.html_url
	};
}
/**
* Update an existing comment
*/
async function updateComment(octokit, ctx, commentId, body) {
	const { data } = await octokit.rest.issues.updateComment({
		owner: ctx.owner,
		repo: ctx.repo,
		comment_id: commentId,
		body
	});
	return {
		commentId: data.id,
		commentUrl: data.html_url
	};
}
/**
* Create or update a comment (upsert pattern)
*/
async function upsertComment(octokit, ctx, issueNumber, body, identifier) {
	const existing = await findBotComment(octokit, ctx, issueNumber, identifier);
	if (existing) return updateComment(octokit, ctx, existing.id, body);
	return createComment(octokit, ctx, issueNumber, body);
}
/**
* Find PR number for a push event by matching branch
*/
async function findPrForPush(octokit, ctx, ref) {
	const branch = ref.replace("refs/heads/", "");
	const { data: pullRequests } = await octokit.rest.pulls.list({
		owner: ctx.owner,
		repo: ctx.repo,
		state: "open",
		head: `${ctx.owner}:${branch}`
	});
	return pullRequests[0]?.number ?? null;
}

//#endregion
//#region src/format.ts
/**
* Format packages list for the comment body
*/
function formatPackages(packages) {
	if (packages.length === 0) return "_No packages published_";
	return packages.map((pkg) => `- \`${pkg.name}\`: ${pkg.url}`).join("\n");
}
/**
* Format templates list for the comment body
*/
function formatTemplates(templates) {
	if (templates.length === 0) return "_No templates available_";
	return templates.map((tmpl) => `- [${tmpl.name}](${tmpl.url})`).join("\n");
}
/**
* Build the full comment body
*/
function buildCommentBody(output, commitUrl, identifier) {
	return `${identifier}

### Published Packages

${formatPackages(output.packages)}

### Templates

${formatTemplates(output.templates)}

[View Commit](${commitUrl})`;
}
/**
* Build the step summary content (same as comment but with header)
*/
function buildStepSummary(output, commitUrl, prFound) {
	const packages = formatPackages(output.packages);
	const templates = formatTemplates(output.templates);
	return `# pkg-pr-new Publish Results

${prFound ? ":white_check_mark: Comment posted to PR" : ":information_source: No PR found, logged to console only"}

## Published Packages

${packages}

## Templates

${templates}

[View Commit](${commitUrl})`;
}
/**
* Format log output for console
*/
function formatLogOutput(output, commitUrl) {
	const separator = "=".repeat(50);
	const packages = output.packages.map((pkg) => `  - ${pkg.name}: ${pkg.url}`).join("\n");
	const templates = output.templates.map((tmpl) => `  - ${tmpl.name}: ${tmpl.url}`).join("\n");
	return `
${separator}
Publish Information
${separator}

Published Packages:
${packages || "  (none)"}

Templates:
${templates || "  (none)"}

Commit URL: ${commitUrl}
${separator}`;
}

//#endregion
//#region src/run.ts
/**
* Get inputs from action.yml
*/
function getInputs() {
	return {
		githubToken: core.getInput("github-token", { required: true }),
		outputFile: core.getInput("output-file") || "output.json",
		commentIdentifier: core.getInput("comment-identifier") || "## pkg-pr-new publish"
	};
}
/**
* Load and parse the pkg-pr-new output file
*/
function loadOutputFile(filePath, readFile = readFileSync) {
	const content = readFile(filePath, "utf8");
	return JSON.parse(content);
}
/**
* Get the commit SHA based on event type
*/
function getCommitSha() {
	if (context.eventName === "pull_request") return context.payload.pull_request.head.sha;
	if (context.eventName === "push") return context.payload.after;
	throw new Error(`Unsupported event type: ${context.eventName}`);
}
/**
* Build the commit URL
*/
function buildCommitUrl(sha) {
	return `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${sha}`;
}
/**
* Main run logic
* @param readFile - Optional readFile function for testing (defaults to fs.readFileSync)
*/
async function run(readFile = readFileSync) {
	const inputs = getInputs();
	const octokit = getOctokit(inputs.githubToken);
	const ctx = {
		owner: context.repo.owner,
		repo: context.repo.repo
	};
	core.info(`Loading output file: ${inputs.outputFile}`);
	const output = loadOutputFile(inputs.outputFile, readFile);
	core.info(`Found ${output.packages.length} packages, ${output.templates.length} templates`);
	const sha = getCommitSha();
	const commitUrl = buildCommitUrl(sha);
	core.info(`Commit: ${sha}`);
	const body = buildCommentBody(output, commitUrl, inputs.commentIdentifier);
	let prNumber = null;
	if (context.eventName === "pull_request") prNumber = context.issue.number;
	else if (context.eventName === "push") {
		core.info("Push event - searching for associated PR...");
		prNumber = await findPrForPush(octokit, ctx, context.ref);
		if (prNumber) core.info(`Found PR #${prNumber}`);
		else core.info("No open PR found for this branch");
	}
	const result = { prFound: prNumber !== null };
	if (prNumber) {
		core.info(`Posting comment to PR #${prNumber}...`);
		const commentResult = await upsertComment(octokit, ctx, prNumber, body, inputs.commentIdentifier);
		result.commentId = commentResult.commentId;
		result.commentUrl = commentResult.commentUrl;
		core.info(`Comment posted: ${commentResult.commentUrl}`);
	} else core.info(formatLogOutput(output, commitUrl));
	const summary = buildStepSummary(output, commitUrl, result.prFound);
	await core.summary.addRaw(summary).write();
	core.setOutput("pr-found", result.prFound.toString());
	core.setOutput("comment-id", result.commentId?.toString() ?? "");
	core.setOutput("comment-url", result.commentUrl ?? "");
	return result;
}

//#endregion
//#region src/index.ts
async function main() {
	try {
		await run();
	} catch (error) {
		if (error instanceof Error) {
			core.error(error.stack ?? error.message);
			core.setFailed(error.message);
		} else core.setFailed(String(error));
	}
}
main();

//#endregion
export {  };
//# sourceMappingURL=index.mjs.map