/**
 * Tests for CLI command via DreamCLI testkit
 *
 * Tests error handling paths using runCommand() with injected env.
 * Happy paths are covered by sync_test.ts unit tests.
 */

import { runCommand } from '@kjanat/dreamcli/testkit';
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert';
import { parseRepository, syncCommand } from 'github-labelmanager';

// =============================================================================
// Missing token tests
// =============================================================================

Deno.test('sync command - fails when GITHUB_TOKEN is missing', async () => {
	const result = await runCommand(syncCommand, ['owner/repo'], {
		env: {},
	});

	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'token');
});

// =============================================================================
// Missing repository tests
// =============================================================================

Deno.test('sync command - fails when repository argument is missing', async () => {
	const result = await runCommand(syncCommand, [], {
		env: { GITHUB_TOKEN: 'token' },
	});

	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'repository');
});

// =============================================================================
// Invalid repository format tests
// =============================================================================

Deno.test('sync command - fails when repository format is invalid', async () => {
	const result = await runCommand(syncCommand, ['invalid-repo-format'], {
		env: { GITHUB_TOKEN: 'token' },
	});

	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'owner/repo');
});

Deno.test('sync command - fails when repository has empty owner', async () => {
	const result = await runCommand(syncCommand, ['/repo'], {
		env: { GITHUB_TOKEN: 'token' },
	});

	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'owner/repo');
});

// =============================================================================
// Config file not found tests
// =============================================================================

Deno.test('sync command - fails when config file not found', async () => {
	const result = await runCommand(syncCommand, ['owner/repo', '--config', 'nonexistent.yml'], {
		env: { GITHUB_TOKEN: 'token' },
	});

	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'Config file not found');
});

// =============================================================================
// Invalid YAML tests
// =============================================================================

Deno.test('sync command - fails when config has invalid YAML', async () => {
	const tempFile = await Deno.makeTempFile({ suffix: '.yml' });
	await Deno.writeTextFile(tempFile, 'invalid: yaml: content: [');

	try {
		const result = await runCommand(syncCommand, ['owner/repo', '--config', tempFile], {
			env: { GITHUB_TOKEN: 'token' },
		});

		assertEquals(result.exitCode !== 0, true);
		const stderr = result.stderr.join('\n');
		assertStringIncludes(stderr, 'YAML parse error');
	} finally {
		await Deno.remove(tempFile);
	}
});

// =============================================================================
// Invalid schema tests
// =============================================================================

Deno.test('sync command - fails when config has invalid schema', async () => {
	const tempFile = await Deno.makeTempFile({ suffix: '.yml' });
	await Deno.writeTextFile(tempFile, 'wrong: schema\nno_labels: true');

	try {
		const result = await runCommand(syncCommand, ['owner/repo', '--config', tempFile], {
			env: { GITHUB_TOKEN: 'token' },
		});

		assertEquals(result.exitCode !== 0, true);
		const stderr = result.stderr.join('\n');
		assertStringIncludes(stderr, 'Invalid');
	} finally {
		await Deno.remove(tempFile);
	}
});

// =============================================================================
// parseRepository unit tests
// =============================================================================

Deno.test('parseRepository - parses valid owner/repo', () => {
	const result = parseRepository('my-org/my-repo');
	assertEquals(result, { owner: 'my-org', repo: 'my-repo' });
});

Deno.test('parseRepository - throws on missing slash', () => {
	assertThrows(() => parseRepository('invalid'), Error, 'owner/repo');
});

Deno.test('parseRepository - throws on empty owner', () => {
	assertThrows(() => parseRepository('/repo'), Error, 'owner/repo');
});

Deno.test('parseRepository - throws on empty repo', () => {
	assertThrows(() => parseRepository('owner/'), Error, 'owner/repo');
});

// =============================================================================
// Actions compatibility (env-only resolution)
// =============================================================================

Deno.test('sync command - env-only path works (Actions compat)', async () => {
	const result = await runCommand(syncCommand, [], {
		env: {
			GITHUB_TOKEN: 'token',
			REPO: 'owner/repo',
			CONFIG_PATH: 'nonexistent.yml',
		},
	});

	// Config file won't exist, but it should get past arg resolution
	assertEquals(result.exitCode !== 0, true);
	const stderr = result.stderr.join('\n');
	assertStringIncludes(stderr, 'Config file not found');
});
