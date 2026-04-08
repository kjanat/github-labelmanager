# src/domain/

Pure domain types and value objects. Zero dependencies outside this directory.

## Files

| File        | Contents                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labels.ts` | Branded types (`LabelName`, `LabelColor`, `LabelDescription`), validation utils, `Label` interface, `label()` fluent builder. Compile-time hex validation via template literal types. |
| `types.ts`  | `EnvConfig`, `SyncOperation`, `SyncResult` (with summary counts). Re-exports `LabelConfig`, `LabelConfigMeta`, `LabelDefinition` from `src/schema.ts`.                                |
| `mod.ts`    | Barrel — re-exports all public types and utilities from above.                                                                                                                        |

## Key Types

- **`LabelName`** — branded string, non-empty, trimmed
- **`LabelColor`** — branded string, 6-char lowercase hex without `#`
- **`LabelDescription`** — branded string, max 100 chars
- **`Label`** — name + optional color/description/aliases
- **`SyncOperation`** — single sync action (create/update/rename/delete/skip)
- **`SyncResult`** — operations array + summary counts + success flag
- **`EnvConfig`** — CLI/env config (owner, repo, token, dryRun, configPath)

## Validation Utilities

- **`LabelColorUtils`** — `parse()` (strips `#`, expands 3→6 char, lowercases), `is()`, `normalize()`
- **`LabelNameUtils`** — `parse()` (trims, rejects empty), `is()`
- **`LabelDescriptionUtils`** — `parse()` (enforces 100-char limit), `is()`
- **`label(name)`** — fluent builder: `.color()`, `.description()`, `.aliases()`, `.build()`

## Where to Look

| Task                   | File        | Notes                                            |
| ---------------------- | ----------- | ------------------------------------------------ |
| Add sync result field  | `types.ts`  | Extend `SyncResult` or `SyncOperation`           |
| Change color handling  | `labels.ts` | `LabelColorUtils`, `normalizeHexCandidate()`     |
| Change name validation | `labels.ts` | `LabelNameUtils`                                 |
| Add new branded type   | `labels.ts` | Follow `Brand<T, B>` pattern, add utils + export |
| Add config shape field | `types.ts`  | But Zod schema lives in `src/schema.ts`          |

## Conventions

- No imports from outside `domain/` — architecture boundary
- `interface` for shapes, branded types via `Brand<T, B>` for nominal typing
- Utils are const objects implementing explicit interfaces (`ILabelColorUtils`, etc.)
- `types.ts` re-exports config types from `src/schema.ts` (schema is source of truth for Zod)
- Builder pattern uses closures, not classes

## Anti-Patterns

- Never add external dependencies — domain must stay pure
- No I/O, no side effects — this layer is deterministic
- Don't duplicate Zod schemas here — they live in `src/schema.ts`
- Don't use `as Type` except in branded type constructors (validated first)
