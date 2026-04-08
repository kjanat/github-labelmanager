/**
 * v2 Design Types (spec artifact)
 *
 * This file is intentionally design-first and not imported by runtime code.
 * It anchors planner/executor contracts before implementation.
 * @internal
 */

export interface RepoTarget {
	readonly owner: string;
	readonly repo: string;
}

export interface DesiredLabel {
	readonly name: string;
	readonly color?: string;
	readonly descriptionIntent: DescriptionIntent;
	readonly aliases: readonly string[];
}

export interface ExistingLabel {
	readonly name: string;
	readonly color?: string | null;
	readonly description?: string | null;
}

export type DescriptionIntent =
	| { readonly kind: 'keep' }
	| { readonly kind: 'set'; readonly value: string }
	| { readonly kind: 'clear' };

export type DeleteReason =
	| 'not-in-config'
	| 'explicit-policy';

export type PlanOp =
	| {
		readonly kind: 'create';
		readonly desired: DesiredLabel;
	}
	| {
		readonly kind: 'update';
		readonly current: ExistingLabel;
		readonly desired: DesiredLabel;
	}
	| {
		readonly kind: 'rename';
		readonly current: ExistingLabel;
		readonly desired: DesiredLabel;
	}
	| {
		readonly kind: 'delete';
		readonly current: ExistingLabel;
		readonly reason: DeleteReason;
	}
	| {
		readonly kind: 'noop';
		readonly label: ExistingLabel;
		readonly reason: string;
	}
	| {
		readonly kind: 'conflict';
		readonly conflict: Conflict;
	};

export type Conflict =
	| {
		readonly code: 'duplicate-target';
		readonly labels: readonly string[];
	}
	| {
		readonly code: 'case-collision';
		readonly labels: readonly string[];
	}
	| {
		readonly code: 'alias-cycle';
		readonly cycle: readonly string[];
	}
	| {
		readonly code: 'alias-target-collision';
		readonly alias: string;
		readonly target: string;
	};

export interface PlanInput {
	readonly target: RepoTarget;
	readonly desired: readonly DesiredLabel[];
	readonly existing: readonly ExistingLabel[];
	readonly generatedAt: string;
}

export interface SyncPlan {
	readonly version: '2';
	readonly repo: RepoTarget;
	readonly generatedAt: string;
	readonly inputHash: string;
	readonly ops: readonly PlanOp[];
}

export type ApplyFailureCode =
	| 'auth'
	| 'permission'
	| 'validation'
	| 'conflict'
	| 'transport';

export interface ApplyFailure {
	readonly code: ApplyFailureCode;
	readonly message: string;
	readonly remediation: string;
}

export interface AppliedOp {
	readonly op: PlanOp;
	readonly success: boolean;
	readonly attempts: number;
	readonly latencyMs: number;
	readonly failure?: ApplyFailure;
}

export interface ApplySummary {
	readonly created: number;
	readonly updated: number;
	readonly renamed: number;
	readonly deleted: number;
	readonly noop: number;
	readonly conflicts: number;
	readonly failed: number;
}

export interface ApplyResult {
	readonly success: boolean;
	readonly summary: ApplySummary;
	readonly operations: readonly AppliedOp[];
}

export interface ApplyOptions {
	readonly dryRun?: boolean;
	readonly maxRetries?: number;
}

export interface Planner {
	buildPlan(input: PlanInput): Promise<SyncPlan>;
}

export interface Executor {
	applyPlan(plan: SyncPlan, options?: ApplyOptions): Promise<ApplyResult>;
}
