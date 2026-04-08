# World-Class Label Sync Master Plan (v2)

## Summary

Build a hard-break v2 architecture for `github-labelmanager` around deterministic planning, idempotent execution, and production-grade reliability. Sequence work as trust-first: correctness and safety before org-scale fan-out.

## Problem Statement

- Current architecture is strong, but sync orchestration is still monolithic.
- Edge-case correctness and stale docs create trust risk.
- Reliability confidence is high in unit tests, weaker in end-to-end runtime behavior.

## Goals

1. Deterministic `plan -> apply` contract.
2. Explicit conflict and destructive-change visibility before mutation.
3. Idempotent execution with actionable error taxonomy.
4. Unified behavior across CLI, Action, library, and Docker.
5. CI-enforced documentation correctness.

## Non-Goals

- No hosted SaaS/dashboard.
- No GitHub Projects automation or policy engine.
- No compatibility shim period for v1 API surface.

## Core Types (Anchoring Contract)

Design source of truth is `specs/types.ts`.

```ts
export interface SyncPlan {
	readonly version: '2';
	readonly repo: { owner: string; repo: string };
	readonly generatedAt: string;
	readonly inputHash: string;
	readonly ops: readonly PlanOp[];
}

export type PlanOp =
	| { kind: 'create'; desired: DesiredLabel }
	| { kind: 'update'; current: ExistingLabel; desired: DesiredLabel }
	| { kind: 'rename'; current: ExistingLabel; desired: DesiredLabel }
	| { kind: 'delete'; current: ExistingLabel; reason: DeleteReason }
	| { kind: 'noop'; label: ExistingLabel; reason: string }
	| { kind: 'conflict'; conflict: Conflict };

export type Conflict =
	| { code: 'duplicate-target'; labels: readonly string[] }
	| { code: 'case-collision'; labels: readonly string[] }
	| { code: 'alias-cycle'; cycle: readonly string[] }
	| { code: 'alias-target-collision'; alias: string; target: string };
```

## API Contract Sketch

```ts
export interface Planner {
	buildPlan(input: PlanInput): Promise<SyncPlan>;
}

export interface Executor {
	applyPlan(plan: SyncPlan, options?: ApplyOptions): Promise<ApplyResult>;
}

export interface Diagnostics {
	validateConfig(path: string): Promise<ValidationReport>;
	doctor(target: RepoTarget, options?: DoctorOptions): Promise<DoctorReport>;
}
```

## Breaking Surface and Migration Contract (v1 -> v2)

| Surface | v1 behavior                                       | v2 behavior                               | Migration impact         |
| ------- | ------------------------------------------------- | ----------------------------------------- | ------------------------ |
| CLI     | implicit sync (`github-labelmanager owner/repo`)  | explicit `plan` then `apply`              | required command change  |
| Library | sync-first API                                    | planner/executor API                      | required code change     |
| Config  | `labels` + optional deprecated `delete` tolerated | `delete` rejected, declarative model only | required config cleanup  |
| Action  | direct run semantics                              | emits plan summary then apply path        | workflow update required |

### Migration policy

- No shim period.
- No compatibility wrapper package.
- Release notes include exact break matrix and before/after examples.

## Deliverables

1. D1: Invariants and architecture decision set.
2. D2: New operation algebra and data model.
3. D3: Deterministic planner engine.
4. D4: Idempotent executor engine.
5. D5: Preflight conflict detection.
6. D6: Error taxonomy with remediation hints.
7. D7: CLI reset (`plan`, `apply`, `validate`, `doctor`).
8. D8: Library API reset around planner/executor.
9. D9: Structured output reports (`json`, `md`, annotations).
10. D10: Reliability expansion and CI quality gates.
11. D11: Documentation rewrite from executable examples.
12. D12: Org runner for multi-repo staged execution.

## Scope Boundaries

### D7 (`doctor`) boundaries

#### MVP

- Verify token present and has required scopes.
- Verify repo reachability and label read access.
- Verify config schema validity and conflict-free planability.
- Return non-zero exit on hard failures.

#### Stretch

- Rate-limit forecast and optimization hints.
- Optional autofix suggestions for common config mistakes.

### D12 (org runner) boundaries

#### MVP

- Input is explicit repo list (no dynamic discovery).
- Bounded concurrency default `4`, min `1`, max `16`.
- Per-repo isolation: failure in one repo does not abort others.
- Aggregate report with per-repo summary and final exit policy.

#### Stretch

- Dynamic repo discovery from org/team filters.
- Checkpoint/resume for very large org runs.

## Dependencies

- D2 depends on D1.
- D3 depends on D2.
- D5 depends on D3.
- D4 depends on D3 and D5.
- D6 depends on D3 and D4.
- D7 depends on D3, D4, and D6.
- D8 depends on D3, D4, and D6.
- D9 depends on D4 and D6.
- D10 depends on D7, D8, and D9.
- D11 depends on D7 and D8.
- D12 depends on D3, D4, D6, and D9.

## Sequencing Rationale

- D3 before D5: preflight conflicts validate the planner output graph; conflict rules are defined against concrete planned operations.
- D5 before D4: executor must never run unvalidated plans.
- D6 after D4 baseline: taxonomy is finalized using real planner/executor failure paths, avoiding speculative error models.
- D7/D8 after D6: external surfaces should not expose unstable error contracts.
- D12 last: org fan-out multiplies all core correctness flaws, so it ships only after single-repo core is hardened.

## Deliverable-Level Acceptance Criteria

| Deliverable | Acceptance criteria                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1          | ADR set merged; invariants include determinism, idempotency, conflict-first semantics, destructive-op visibility.       |
| D2          | `specs/types.ts` committed; all operation kinds and conflict variants are discriminated unions.                         |
| D3          | Identical inputs produce byte-stable plan output and same `inputHash` in repeated runs.                                 |
| D4          | Applying the same successful plan twice yields zero mutations on second run.                                            |
| D5          | Duplicate target, case collision, alias cycle, and alias-target collisions all fail preflight before API calls.         |
| D6          | Every failure maps to a stable code and remediation hint (`auth`, `permission`, `validation`, `conflict`, `transport`). |
| D7          | `plan`, `apply`, `validate`, `doctor` commands implemented; `doctor` includes all MVP checks.                           |
| D8          | Public API exports only planner/executor diagnostics contracts; legacy sync-first exports removed.                      |
| D9          | JSON and markdown report outputs share identical summary counts and operation totals.                                   |
| D10         | CI blocks on: line coverage >= 90%, branch coverage >= 80%, npm artifact smoke test, action smoke test.                 |
| D11         | README, JSR README, and NPM README examples are executed in CI and have zero stale API names.                           |
| D12         | Org runner supports explicit repo list with concurrency range `1..16` (default `4`) and per-repo isolation.             |
