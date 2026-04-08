# src/

Application core. Hexagonal architecture: domain -> ports -> adapters, orchestrated at this level.

## Where to Look

| Task                                     | Location                             | Notes                                                   |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Sync logic (create/update/rename/delete) | `sync.ts`                            | Orchestration core, calls LabelManager methods          |
| Add/change GitHub API calls              | `adapters/client/`                   | `base.ts` shared CRUD, subclassed per env               |
| Add config option                        | `domain/types.ts` + `schema.ts`      | Type first, then Zod schema, then regenerate            |
| Branded domain types                     | `domain/labels.ts`                   | `LabelColor`, `LabelName`, `LabelDescription`           |
| Port interfaces                          | `ports/github.ts`, `ports/logger.ts` | `IGitHubClient`, `ILogger` contracts                    |
| Env-based adapter selection              | `factory.ts`                         | Reads `GITHUB_ACTIONS` env var                          |
| DI facade for consumers                  | `client.ts`                          | `LabelManager` class                                    |
| Zod schemas + JSON schema                | `schema.ts`                          | Dual schemas: runtime (transformed) + generation (base) |
| YAML config loading                      | `config.ts`                          | Parses YAML, validates via Zod, extracts line numbers   |
| Test mocks/stubs/fixtures                | `testing/`                           | `MockGitHubClient`, `NullLogger`, `createTestEnv`       |
| Build utilities                          | `tools/sort-schema.ts`               | Schema JSON key sorter                                  |

## Code Map (src/ level files)

- **`mod.ts`** -- Public API barrel. Re-exports everything including `testing/`. Also re-exports `parseRepository` from `github-labelmanager` (the CLI package).
- **`client.ts`** -- `LabelManager` facade. Thin delegation to `IGitHubClient`/`ILogger`. Constructor takes `EnvConfig` + optional DI overrides (`LabelManagerOptions`). Defaults call `factory.ts` to auto-create impls.
- **`config.ts`** -- `loadConfig(path?)` reads YAML, validates with `labelConfig` Zod schema, extracts YAML line numbers into `_meta` for GitHub Actions annotations. Falls back to `CONFIG_PATH` env, then `.github/labels.yml`.
- **`factory.ts`** -- `isGitHubActions()` checks `GITHUB_ACTIONS=true`. Creates `ActionsGitHubClient`/`ActionsLogger` in CI, `OctokitClient`/`ConsoleLogger` locally. `createServices()` bundles both.
- **`sync.ts`** -- `syncLabels(manager, config)` -- the orchestration core. Fetches current labels, diffs against config, executes create/update/rename/delete. Declarative sync: unlisted labels get deleted unless matched by `ignore` glob patterns. Returns `SyncResult` with operation log + summary counts.
- **`schema.ts`** -- Single source of truth for Zod schemas. Two schema variants per type: base (for JSON schema generation, string constraints only) and transformed (for runtime, produces branded types). `labelConfig` is the root runtime validator. `labelConfigSchema` is the root generation schema.

## Subdirectories

- **`domain/`** -- Pure types + value objects. Zero runtime deps. Branded types (`LabelName`, `LabelColor`, `LabelDescription`) with compile-time hex validation. `types.ts` re-exports `LabelConfig`/`LabelDefinition` from `schema.ts`.
- **`ports/`** -- Interface contracts only. `IGitHubClient` (CRUD + pagination), `ILogger` (multi-level + annotations + summary). No implementations.
- **`adapters/`** -- Two adapter families: `client/` (ActionsGitHubClient, OctokitClient inheriting base) and `logger/` (ActionsLogger, ConsoleLogger). No top-level `mod.ts`; barrels are per-subdirectory.
- **`testing/`** -- Exported in public API (intentional). `MockGitHubClient` (in-memory label store), `MockLogger` (captures calls), `NullLogger` (silent), `createTestEnv()` helper, `mockFetch`/`createMockOctokit` for adapter-level tests.
- **`tools/`** -- Build-time utilities, not part of public API. `sort-schema.ts` sorts JSON schema keys.

## Conventions

- `domain/types.ts` re-exports `LabelConfig`/`LabelConfigMeta`/`LabelDefinition` from `schema.ts` -- schema.ts is the single source of truth, types.ts provides the domain-layer re-export surface
- `schema.ts` has paired schemas: `labelNameBase`/`labelName`, `hexColorBase`/`hexColor`, `labelConfigSchema`/`labelConfig` -- base for JSON schema generation, transformed for runtime validation
- `config.ts` attaches `_meta` (file path + line numbers) to parsed config for GitHub Actions annotations in `sync.ts`
- `sync.ts` uses `matchesIgnorePattern()` with `@std/path/glob-to-regexp` for glob-based label preservation
- `client.ts` constructor: pass nothing for auto-detection, pass `{ client, logger }` for DI/testing
- `adapters/` has no top-level mod.ts -- `mod.ts` at src/ level imports from `adapters/client/mod.ts` and `adapters/logger/mod.ts` directly

## Anti-Patterns

- Don't import from subdirectories (`adapters/client/base.ts`, `domain/labels.ts`) in external code -- use `mod.ts` barrel
- `mod.ts` re-exports `parseRepository` and `RepoArg` from `github-labelmanager` package (the CLI) -- inverted dependency, architectural quirk, do not replicate
- `testing/` is part of the public API -- this is intentional for downstream consumers to use mocks; don't move it out
- `domain/types.ts` delegates to `schema.ts` for `LabelConfig`/`LabelDefinition` -- don't duplicate type definitions, schema.ts owns them
