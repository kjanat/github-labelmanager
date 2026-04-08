#!/usr/bin/env -S deno run --allow-net=api.github.com --allow-read --allow-env
/**
 * CLI entrypoint for github-labelmanager
 * @module
 */

import denoJson from '#/deno.json' with { type: 'json' };
import { cli } from '@kjanat/dreamcli';
import { syncCommand } from './command.ts';

const app = cli(denoJson.name.split('/')[1])
	.version(denoJson.version)
	.description(denoJson.description)
	.default(syncCommand)
	.completions();

export type { RepoArg } from './command.ts';
export { parseRepository, syncCommand } from './command.ts';

if (import.meta.main) {
	app.run();
}
