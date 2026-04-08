/**
 * Stub utilities for testing
 * @module
 */

import type { SyncResult } from '~/domain/types.ts';
import type { AnnotationProperties, ILogger } from '~/ports/logger.ts';

/**
 * No-op logger that silences all output
 *
 * Use this in tests to prevent console spam while still exercising
 * code paths that call logger methods.
 */
export class NullLogger implements ILogger {
	debug(_msg: string): void {}
	info(_msg: string): void {}
	warn(_msg: string, _props?: AnnotationProperties): void {}
	error(_msg: string, _props?: AnnotationProperties): void {}
	notice(_msg: string, _props?: AnnotationProperties): void {}
	startGroup(_name: string): void {}
	endGroup(): void {}
	group<T>(_name: string, fn: () => Promise<T>): Promise<T> {
		return fn();
	}
	setFailed(_msg: string | Error): void {}
	success(_msg: string): void {}
	skip(_msg: string): void {}
	writeSummary(_result: SyncResult): Promise<void> {
		return Promise.resolve();
	}
}
