/**
 * v2 Design Types (spec artifact)
 *
 * This file is intentionally design-first and not imported by runtime code.
 * It anchors planner/executor contracts before implementation.
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

export type DeleteReason = 'not-in-config';

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

export type ExecutablePlanOp = Exclude<PlanOp, { readonly kind: 'conflict' }>;

export type AppliedOp =
	| {
		readonly kind: 'applied';
		readonly op: ExecutablePlanOp;
		readonly attempts: number;
		readonly latencyMs: number;
	}
	| {
		readonly kind: 'failed';
		readonly op: ExecutablePlanOp;
		readonly attempts: number;
		readonly latencyMs: number;
		readonly failure: ApplyFailure;
	};

export interface ApplySummary {
	readonly created: number;
	readonly updated: number;
	readonly renamed: number;
	readonly deleted: number;
	readonly noop: number;
	readonly conflicts: number;
	readonly failed: number;
}

export type ApplyResult =
	| {
		readonly kind: 'ok';
		readonly summary: ApplySummary;
		readonly operations: readonly AppliedOp[];
	}
	| {
		readonly kind: 'failed';
		readonly summary: ApplySummary;
		readonly operations: readonly AppliedOp[];
		readonly failures: readonly ApplyFailure[];
	};

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

export interface ValidationIssue {
	readonly code: 'schema' | 'semantic' | 'conflict';
	readonly message: string;
	readonly path?: string;
}

export interface ValidationReport {
	readonly valid: boolean;
	readonly issues: readonly ValidationIssue[];
}

export interface DoctorOptions {
	/** default: 'plan' */
	readonly mode?: 'plan' | 'apply';
	/** default: 'auto' */
	readonly writeProbe?: 'auto' | 'canary' | 'none';
	/** default: '__glm_probe__' */
	readonly probeLabelPrefix?: string;
	/** default: 5000 */
	readonly probeTimeoutMs?: number;
}

export interface EffectiveDoctorOptions {
	readonly mode: 'plan' | 'apply';
	readonly writeProbe: 'auto' | 'canary' | 'none';
	readonly probeLabelPrefix: string;
	readonly probeTimeoutMs: number;
}

export interface DoctorCheck {
	readonly id:
		| 'token-present'
		| 'labels-read-access'
		| 'labels-write-capability'
		| 'config-valid'
		| 'plan-buildable';
	readonly required: boolean;
	readonly status: 'passed' | 'failed' | 'skipped';
	readonly failureCode?: ApplyFailureCode;
	readonly detail: string;
	readonly remediation?: string;
}

export interface DoctorReport {
	readonly target: RepoTarget;
	readonly checks: readonly DoctorCheck[];
	readonly success: boolean;
	readonly exitCode: 0 | 1;
}

export interface Diagnostics {
	validateConfig(path: string): Promise<ValidationReport>;
	doctor(target: RepoTarget, options?: DoctorOptions): Promise<DoctorReport>;
}
