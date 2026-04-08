/**
 * Types for github-labelmanager
 * @module
 */

// Re-export from schema source (single source of truth)
export type { LabelConfig, LabelConfigMeta, LabelDefinition } from '../schema.ts';

/** Environment/CLI configuration */
export interface EnvConfig {
	configPath?: string;
	dryRun: boolean;
	owner: string;
	repo: string;
	token: string;
}

/** Individual sync operation result */
export interface SyncOperation {
	/** Details for summary display */
	details?: {
		color?: string;
		description?: string;
		/** For updates: previous values */
		oldColor?: string;
		oldDescription?: string;
	};
	error?: string;
	/** For renames: the old name */
	from?: string;
	label: string;
	success: boolean;
	type: 'create' | 'update' | 'rename' | 'delete' | 'skip';
}

/** Result of a sync operation - extensible for different output formats */
export interface SyncResult {
	operations: SyncOperation[];
	success: boolean;
	/** Summary counts */
	summary: {
		created: number;
		updated: number;
		renamed: number;
		deleted: number;
		skipped: number;
		failed: number;
	};
}
