import type { CommentResult, Octokit } from "./types.ts";

interface CommentContext {
  owner: string;
  repo: string;
}

/**
 * Find existing bot comment by identifier string
 */
export async function findBotComment(
  octokit: Octokit,
  ctx: CommentContext,
  issueNumber: number,
  identifier: string,
): Promise<{ id: number; url: string } | null> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: issueNumber,
  });

  const found = comments.find((comment) => comment.body?.includes(identifier));
  if (found) {
    return { id: found.id, url: found.html_url };
  }
  return null;
}

/**
 * Create a new comment on an issue/PR
 */
export async function createComment(
  octokit: Octokit,
  ctx: CommentContext,
  issueNumber: number,
  body: string,
): Promise<CommentResult> {
  const { data } = await octokit.rest.issues.createComment({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: issueNumber,
    body,
  });

  return { commentId: data.id, commentUrl: data.html_url };
}

/**
 * Update an existing comment
 */
export async function updateComment(
  octokit: Octokit,
  ctx: CommentContext,
  commentId: number,
  body: string,
): Promise<CommentResult> {
  const { data } = await octokit.rest.issues.updateComment({
    owner: ctx.owner,
    repo: ctx.repo,
    comment_id: commentId,
    body,
  });

  return { commentId: data.id, commentUrl: data.html_url };
}

/**
 * Create or update a comment (upsert pattern)
 */
export async function upsertComment(
  octokit: Octokit,
  ctx: CommentContext,
  issueNumber: number,
  body: string,
  identifier: string,
): Promise<CommentResult> {
  const existing = await findBotComment(octokit, ctx, issueNumber, identifier);

  if (existing) {
    return updateComment(octokit, ctx, existing.id, body);
  }
  return createComment(octokit, ctx, issueNumber, body);
}

/**
 * Find PR number for a push event by matching branch
 */
export async function findPrForPush(
  octokit: Octokit,
  ctx: CommentContext,
  ref: string,
): Promise<number | null> {
  const branch = ref.replace("refs/heads/", "");
  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner: ctx.owner,
    repo: ctx.repo,
    state: "open",
    head: `${ctx.owner}:${branch}`,
  });

  return pullRequests[0]?.number ?? null;
}
