/**
 * GitHub Actions client using @actions/github
 * Pre-configured for GitHub Actions environment with proper proxy support
 * @module
 */

import * as github from "@actions/github";
import type { ILogger } from "@/adapters/logger/mod.ts";
import type {
  GitHubClientConfig,
  GitHubLabel,
  GitHubLabelSchema,
} from "./types.ts";
import { BaseGitHubClient } from "./base.ts";

/** Octokit instance type from @actions/github */
type ActionsOctokit = ReturnType<typeof github.getOctokit>;

/**
 * GitHub Actions client using @actions/github
 *
 * Features:
 * - Pre-authenticated via GITHUB_TOKEN
 * - Proper proxy support for self-hosted runners
 * - Correct base URL handling for GHES
 * - Native pagination via octokit.paginate()
 *
 * Note: Does not include throttling - GitHub Actions has shorter runs
 * and rate limiting is less of a concern
 */
export class ActionsGitHubClient extends BaseGitHubClient {
  protected readonly octokit: ActionsOctokit;

  constructor(config: GitHubClientConfig, logger: ILogger) {
    super(config, logger);
    // @actions/github handles authentication and proxy configuration
    this.octokit = github.getOctokit(config.token);
  }

  async list(): Promise<GitHubLabel[]> {
    const labels = await this.octokit.paginate(
      this.octokit.rest.issues.listLabelsForRepo,
      {
        owner: this.owner,
        repo: this.repo,
        per_page: 100,
      },
    );

    return labels.map((l: GitHubLabelSchema) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    }));
  }
}
