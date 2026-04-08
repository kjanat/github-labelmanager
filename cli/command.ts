/**
 * DreamCLI command definition for github-labelmanager
 * @module
 */

import { arg, CLIError, command, type CommandBuilder, flag } from '@kjanat/dreamcli';
import { LabelManager } from '~/client.ts';
import { ConfigError, loadConfig } from '~/config.ts';
import type { EnvConfig } from '~/domain/types.ts';
import { createLogger } from '~/factory.ts';
import { syncLabels } from '~/sync.ts';

/** Parsed repository argument */
export interface RepoArg {
	owner: string;
	repo: string;
}

/** Parse and validate an `owner/repo` string */
export function parseRepository(raw: unknown): RepoArg {
	const value = String(raw);
	const parts = value.split('/');
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error('Invalid repository format. Expected: owner/repo');
	}
	return { owner: parts[0], repo: parts[1] };
}

/** The sync command — default command for the CLI */
export const syncCommand: CommandBuilder = command('sync')
	.description('Sync GitHub repository labels from YAML config')
	.alias('s')
	.example('github-labelmanager kjanat/my-repo', 'Sync labels for a repository')
	.example(
		'github-labelmanager kjanat/my-repo --dry-run',
		'Preview changes without applying',
	)
	.example(
		'github-labelmanager kjanat/my-repo --config custom.yml',
		'Use a custom config file',
	)
	.arg(
		'repository',
		arg.custom(parseRepository)
			.env('REPO')
			.required()
			.describe('Repository in owner/repo format'),
	)
	.flag(
		'token',
		flag.string()
			.env('GITHUB_TOKEN')
			.required()
			.describe('GitHub Personal Access Token'),
	)
	.flag(
		'config',
		flag.string()
			.env('CONFIG_PATH')
			.default('.github/labels.yml')
			.describe('Path to labels config file'),
	)
	.flag(
		'dry-run',
		flag.boolean()
			.env('DRY_RUN')
			.describe('Run without making changes'),
	)
	.action(async ({ args, flags, out }) => {
		const env: EnvConfig = {
			token: flags.token,
			owner: args.repository.owner,
			repo: args.repository.repo,
			dryRun: flags['dry-run'],
			configPath: flags.config,
		};

		let config: Awaited<ReturnType<typeof loadConfig>>;
		try {
			config = await loadConfig(env.configPath);
		} catch (err) {
			if (err instanceof Deno.errors.NotFound) {
				throw new CLIError(err.message, {
					code: 'CONFIG_NOT_FOUND',
					cause: err,
				});
			}
			if (err instanceof Deno.errors.InvalidData) {
				throw new CLIError(err.message, { code: 'INVALID_CONFIG', cause: err });
			}
			if (err instanceof ConfigError) {
				throw new CLIError(err.message, { code: 'CONFIG_ERROR', cause: err });
			}
			throw err;
		}

		const log = createLogger();
		const manager = new LabelManager(env, { logger: log });

		const spinner = out.spinner(
			`Syncing labels for ${env.owner}/${env.repo}...`,
		);
		const result = await syncLabels(manager, config);

		const { summary } = result;
		const summaryText = `${summary.created} created, ${summary.updated} updated, `
			+ `${summary.renamed} renamed, ${summary.deleted} deleted, `
			+ `${summary.skipped} skipped, ${summary.failed} failed`;

		if (result.success) {
			spinner.succeed(summaryText);
		} else {
			spinner.fail(summaryText);
		}

		log.info(`Summary: ${summaryText}`);
		await log.writeSummary(result);

		if (!result.success) {
			log.setFailed('One or more operations failed');
			throw new CLIError('One or more operations failed', {
				code: 'SYNC_FAILED',
			});
		}
	});
