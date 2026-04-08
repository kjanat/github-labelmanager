/**
 * Tests for ConsoleLogger
 */

import { ConsoleLogger } from '#src/adapters/logger/console.ts';
import { captureConsole } from '#src/testing/mod.ts';
import { assertEquals, assertStringIncludes } from '@std/assert';

let captured: ReturnType<typeof captureConsole>;

Deno.test.beforeEach(() => {
	captured = captureConsole();
});

Deno.test.afterEach(() => {
	captured.restore();
});

// --- Basic logging tests ---

Deno.test('ConsoleLogger - info logs with [info] prefix', () => {
	const logger = new ConsoleLogger();
	logger.info('test message');

	assertEquals(captured.infos.length, 1);
	assertStringIncludes(captured.infos[0], '[info]');
	assertStringIncludes(captured.infos[0], 'test message');
});

Deno.test('ConsoleLogger - warn logs with [warn] prefix', () => {
	const logger = new ConsoleLogger();
	logger.warn('warning message');

	assertEquals(captured.warns.length, 1);
	assertStringIncludes(captured.warns[0], '[warn]');
	assertStringIncludes(captured.warns[0], 'warning message');
});

Deno.test('ConsoleLogger - error logs with [error] prefix', () => {
	const logger = new ConsoleLogger();
	logger.error('error message');

	assertEquals(captured.errors.length, 1);
	assertStringIncludes(captured.errors[0], '[error]');
	assertStringIncludes(captured.errors[0], 'error message');
});

Deno.test('ConsoleLogger - notice logs with [notice] prefix', () => {
	const logger = new ConsoleLogger();
	logger.notice('notice message');

	assertEquals(captured.infos.length, 1);
	assertStringIncludes(captured.infos[0], '[notice]');
	assertStringIncludes(captured.infos[0], 'notice message');
});

Deno.test('ConsoleLogger - success logs with [+] prefix', () => {
	const logger = new ConsoleLogger();
	logger.success('success message');

	assertEquals(captured.logs.length, 1);
	assertStringIncludes(captured.logs[0], '[+]');
	assertStringIncludes(captured.logs[0], 'success message');
});

Deno.test('ConsoleLogger - skip logs with [-] prefix', () => {
	const logger = new ConsoleLogger();
	logger.skip('skip message');

	assertEquals(captured.logs.length, 1);
	assertStringIncludes(captured.logs[0], '[-]');
	assertStringIncludes(captured.logs[0], 'skip message');
});

// --- Debug logging tests ---

Deno.test('ConsoleLogger - debug does not log without DEBUG env', () => {
	Deno.env.delete('DEBUG');
	const logger = new ConsoleLogger();
	logger.debug('debug message');

	assertEquals(captured.debugs.length, 0);
});

Deno.test('ConsoleLogger - debug logs with DEBUG env set', () => {
	Deno.env.set('DEBUG', 'true');
	const logger = new ConsoleLogger();
	logger.debug('debug message');

	assertEquals(captured.debugs.length, 1);
	assertStringIncludes(captured.debugs[0], '[debug]');
	assertStringIncludes(captured.debugs[0], 'debug message');
	Deno.env.delete('DEBUG');
});

// --- Annotation tests ---

Deno.test('ConsoleLogger - warn includes file annotation', () => {
	const logger = new ConsoleLogger();
	logger.warn('warning', { file: 'test.yml', startLine: 5 });

	assertStringIncludes(captured.warns[0], 'test.yml:5');
});

Deno.test('ConsoleLogger - error includes file and column annotation', () => {
	const logger = new ConsoleLogger();
	logger.error('error', { file: 'test.yml', startLine: 10, startColumn: 3 });

	assertStringIncludes(captured.errors[0], 'test.yml:10:3');
});

Deno.test('ConsoleLogger - notice includes title annotation', () => {
	const logger = new ConsoleLogger();
	logger.notice('notice', { title: 'Important' });

	assertStringIncludes(captured.infos[0], 'Important');
});

Deno.test('ConsoleLogger - annotation with file and title', () => {
	const logger = new ConsoleLogger();
	logger.warn('warning', {
		file: 'config.yml',
		startLine: 1,
		title: 'Label',
	});

	assertStringIncludes(captured.warns[0], 'config.yml:1');
	assertStringIncludes(captured.warns[0], 'Label');
});

// --- Group tests ---

Deno.test('ConsoleLogger - startGroup logs group name', () => {
	const logger = new ConsoleLogger();
	logger.startGroup('my-group');

	assertEquals(captured.infos.length, 1);
	assertStringIncludes(captured.infos[0], 'my-group');
});

Deno.test('ConsoleLogger - startGroup/endGroup affects indentation', () => {
	const logger = new ConsoleLogger();
	logger.info('before');
	logger.startGroup('group1');
	logger.info('inside');
	logger.endGroup();
	logger.info('after');

	// "inside" should have more leading spaces than "before" and "after"
	const beforeLen = captured.infos[0].indexOf('[info]');
	const insideLen = captured.infos[2].indexOf('[info]');
	const afterLen = captured.infos[3].indexOf('[info]');

	assertEquals(insideLen > beforeLen, true, 'inside should be indented');
	assertEquals(afterLen, beforeLen, 'after should match before indentation');
});

Deno.test('ConsoleLogger - endGroup does nothing when no group', () => {
	const logger = new ConsoleLogger();
	logger.endGroup(); // Should not throw
	logger.info('test');

	assertEquals(captured.infos.length, 1);
});

Deno.test('ConsoleLogger - group wraps async function', async () => {
	const logger = new ConsoleLogger();
	const result = await logger.group('my-group', () => {
		logger.info('inside group');
		return Promise.resolve(42);
	});

	assertEquals(result, 42);
	assertEquals(captured.infos.length, 2); // group name + inside message
	assertStringIncludes(captured.infos[0], 'my-group');
});

Deno.test('ConsoleLogger - nested groups increase indentation', () => {
	const logger = new ConsoleLogger();
	logger.startGroup('outer');
	logger.info('level 1');
	logger.startGroup('inner');
	logger.info('level 2');
	logger.endGroup();
	logger.info('back to level 1');
	logger.endGroup();

	const level1First = captured.infos[1].indexOf('[info]');
	const level2 = captured.infos[3].indexOf('[info]');
	const level1Second = captured.infos[4].indexOf('[info]');

	assertEquals(level2 > level1First, true, 'level 2 should be more indented');
	assertEquals(level1Second, level1First, 'back to level 1 indentation');
});

// --- setFailed tests ---

Deno.test('ConsoleLogger - setFailed logs error and exits', () => {
	const exitCalls: Array<number | undefined> = [];
	const logger = new ConsoleLogger({ exitFn: (code) => exitCalls.push(code) });

	logger.setFailed('failure message');

	assertEquals(captured.errors.length, 1);
	assertStringIncludes(captured.errors[0], 'failure message');
	assertEquals(exitCalls, [1]);
});

Deno.test('ConsoleLogger - setFailed handles Error object', () => {
	const exitCalls: Array<number | undefined> = [];
	const logger = new ConsoleLogger({ exitFn: (code) => exitCalls.push(code) });

	logger.setFailed(new Error('error object message'));

	assertEquals(captured.errors.length, 1);
	assertStringIncludes(captured.errors[0], 'error object message');
	assertEquals(exitCalls, [1]);
});

// --- writeSummary tests ---

Deno.test('ConsoleLogger - writeSummary is a no-op', async () => {
	const logger = new ConsoleLogger();
	await logger.writeSummary({
		success: true,
		summary: {
			created: 1,
			updated: 0,
			renamed: 0,
			deleted: 0,
			skipped: 0,
			failed: 0,
		},
		operations: [],
	});

	// Should not produce any output
	assertEquals(captured.all.length, 0);
});
