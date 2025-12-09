# Copilot instructions

## Project context

- Deno-based GitHub label manager used as a CLI, GitHub Action, and library.
- Default label configuration lives at `.github/labels.yml`.
- Key entry points: `cli/main.ts` (CLI), `src/mod.ts` (library), `action.yml`
  (Action).
- Import aliases: `~/` → `./src/`, `$/` → `./`.

## Key commands

- Sync labels: `deno task labels OWNER/REPO`
- Dry run sync: `deno task labels:dry-run OWNER/REPO`
- Build/schema generation: `deno task build`
- Type check: `deno check --all`
- Format: `deno fmt`
- Lint: `deno lint`
- Test: `deno task test`

## Testing patterns

- Place tests alongside mirrored source structure under `__tests__/src/**` (see
  `__tests__/src/client_test.ts`), or `tests/` if tooling requires.
- Reuse fixtures and helpers from `src/testing` (`src/testing/fixtures.ts`,
  `src/testing/mocks.ts`) instead of re-creating mocks.
- Mock GitHub and logger ports via dependency injection: pass `MockGitHubClient`
  / `MockLogger` into factories or constructors (e.g., `LabelManager`), or use a
  tiny factory that returns these mocks per test to keep assertions localized.
- Sample: `__tests__/src/client_test.ts` shows wiring mocks into the client;
  `src/testing/mocks.ts` demonstrates how to record calls for assertions.

## Logging

- Supported levels: `debug`, `info`, `warn`, `error` (Actions also supports
  `notice` for annotations).
- Prefer `logger.<level>("short message", { owner, repo, operation, label })`
  style; keep the message concise and attach context as an object. Do not log
  secrets or tokens.
- When to use:
  - `debug`: verbose flow details or dry-run echoes
  - `info`: high-level progress (start/end of sync, counts)
  - `warn`: recoverable issues, skipped work, or annotations
  - `error`: failures that block or require attention
- Example usage patterns in code:
  - Contextual logging and error handling in `src/sync.ts` (e.g., lines ~57-203)
    with annotation metadata.
  - CLI try/catch with `log.setFailed` in `cli/main.ts` lines ~35-85.

## Code style and conventions

- Use the Deno runtime and APIs (not Node.js).
- Prefer JSR imports for stdlib (`jsr:@std/*`) and npm specifiers for npm
  packages.
- Define shapes with `interface`; use `as const` for readonly objects.
- Naming: camelCase for variables/functions, PascalCase for types/classes.
- Handle errors with try/catch and Octokit type guards:
  - Guard example: `isNotFoundError` in `src/adapters/client/base.ts` lines
    ~117-127 checks `status === 404` before handling.
  - Try/catch + logging: see `cli/main.ts` lines ~35-85 for `log.setFailed` and
    help handling.
- Deno permissions (be explicit):
  - Label sync CLI: `--allow-net=api.github.com --allow-read --allow-env`
    (shebang in `cli/main.ts` line 1).
  - Schema/build tools: typically `--allow-read --allow-write` for output paths
    (see `cli/build/schema.ts`).
  - Repo-manipulating scripts:
    `--allow-net --allow-read --allow-write --allow-env` when cloning or
    emitting files. Prefer least privilege per task.

## Architecture map

- `src/domain`: pure business logic and validation (types, label rules, conflict
  handling) with no I/O. Example: label normalization and conflict resolution in
  `src/domain/labels.ts`. Add new rules/derivations here.
- `src/ports`: interfaces/contracts consumed by domain and adapters; no
  implementation details. Example: GitHub client contract in
  `src/ports/github.ts`, logger contract in `src/ports/logger.ts`. Add new
  abstractions when introducing dependencies.
- `src/adapters`: infrastructure implementations of ports and all side effects
  (GitHub REST clients, loggers). Example: Octokit-backed client in
  `src/adapters/client/octokit.ts` and shared logic in
  `src/adapters/client/base.ts`; Actions/console loggers in
  `src/adapters/logger`. Add new adapters when supporting new runtimes or
  transports.
- `src/testing`: fixtures, mocks, and helpers for tests. Example: mock GitHub
  responses and loggers in `src/testing/mocks.ts`, Octokit fixture factory in
  `src/testing/fixtures.ts`. Add reusable test helpers here.
- `src/tools`: build/dev utilities and scripts (e.g., schema sorting in
  `src/tools/sort-schema.ts`, CLI build helpers in `cli/build/*`). Add
  automation scripts here, not in domain logic.
- Orchestration/entry points:
  - Primary entry scripts: `cli/main.ts` (CLI), `src/mod.ts` (library),
    `action.yml` (Action input wiring), and `src/client.ts`/`src/factory.ts` for
    service wiring.
  - Extend `src/sync.ts` for incremental sync behavior or small feature toggles;
    create a new orchestrator module only for large, distinct flows.
