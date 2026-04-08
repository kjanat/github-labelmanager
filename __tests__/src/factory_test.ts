/**
 * Tests for factory functions
 */

import { ActionsGitHubClient } from '#src/adapters/client/mod.ts';
import { ActionsLogger, ConsoleLogger } from '#src/adapters/logger/mod.ts';
import { createGitHubClient, createLogger, createServices, isGitHubActions } from '#src/factory.ts';
import { assertEquals, assertInstanceOf } from '@std/assert';

// =============================================================================
// isGitHubActions tests
// =============================================================================

Deno.test('isGitHubActions - returns true when GITHUB_ACTIONS=true', () => {
	Deno.env.set('GITHUB_ACTIONS', 'true');
	assertEquals(isGitHubActions(), true);
});

Deno.test('isGitHubActions - returns false when GITHUB_ACTIONS not set', () => {
	Deno.env.delete('GITHUB_ACTIONS');
	assertEquals(isGitHubActions(), false);
});

Deno.test('isGitHubActions - returns false when GITHUB_ACTIONS=false', () => {
	Deno.env.set('GITHUB_ACTIONS', 'false');
	assertEquals(isGitHubActions(), false);
});

Deno.test('isGitHubActions - returns false when GITHUB_ACTIONS is other value', () => {
	Deno.env.set('GITHUB_ACTIONS', '1');
	assertEquals(isGitHubActions(), false);
});

// =============================================================================
// createLogger tests
// =============================================================================

Deno.test('createLogger - returns ConsoleLogger when not in GitHub Actions', () => {
	Deno.env.delete('GITHUB_ACTIONS');
	const logger = createLogger();
	assertInstanceOf(logger, ConsoleLogger);
});

Deno.test('createLogger - returns ActionsLogger when in GitHub Actions', () => {
	Deno.env.set('GITHUB_ACTIONS', 'true');
	const logger = createLogger();
	assertInstanceOf(logger, ActionsLogger);
});

// =============================================================================
// createGitHubClient tests
// =============================================================================

// Note: We don't test OctokitClient creation via factory because it creates
// real Octokit with throttling intervals that leak. OctokitClient is tested
// directly in octokit_test.ts with mock Octokit injection.
// This test just verifies the factory returns the correct type in Actions env.

Deno.test('createGitHubClient - returns ActionsGitHubClient when in GitHub Actions', () => {
	Deno.env.set('GITHUB_ACTIONS', 'true');
	const logger = new ActionsLogger();
	const client = createGitHubClient({ token: 'test', owner: 'owner', repo: 'repo', dryRun: false }, logger);
	assertInstanceOf(client, ActionsGitHubClient);
});

// =============================================================================
// createServices tests
// =============================================================================

Deno.test('createServices - returns ActionsLogger and ActionsGitHubClient when in Actions', () => {
	Deno.env.set('GITHUB_ACTIONS', 'true');
	const { logger, client } = createServices({
		token: 'test',
		owner: 'owner',
		repo: 'repo',
		dryRun: false,
	});
	assertInstanceOf(logger, ActionsLogger);
	assertInstanceOf(client, ActionsGitHubClient);
});
