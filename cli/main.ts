#!/usr/bin/env -S deno run --allow-net=api.github.com --allow-read --allow-env

/**
 * CLI entrypoint for github-labelmanager
 * @module
 */

import { cli } from '@kjanat/dreamcli';
import { syncCommand } from './command.ts';

const app = cli('github-labelmanager')
	.version('2.0.0-alpha')
	.description('Sync GitHub repository labels from YAML configuration')
	.default(syncCommand);

export type { RepoArg } from './command.ts';
export { parseRepository, syncCommand } from './command.ts';

if (import.meta.main) {
	app.run();
}
