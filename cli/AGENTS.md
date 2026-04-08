# cli/

CLI driving adapter using `@kjanat/dreamcli`. Thin shell over `src/` modules.

## Structure

| File              | Purpose                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `main.ts`         | Entry point. Wires dreamcli app, sets version/description, re-exports from command.ts. `import.meta.main` guarded. |
| `command.ts`      | `syncCommand` definition (args, flags, action handler). `parseRepository()` + `RepoArg` type.                      |
| `build/npm.ts`    | `@deno/dnt` build script. Patches imports (jsr:->npm:), strips shebang, restores on exit. Bun as package manager.  |
| `build/schema.ts` | Generates `.github/labels.schema.json` from Zod via `z.toJSONSchema()`. Also `import.meta.main` guarded.           |

## Where to Look

| Task                    | File              | Notes                                   |
| ----------------------- | ----------------- | --------------------------------------- |
| Add CLI flag/option     | `command.ts`      | dreamcli `flag()` / `arg()` builders    |
| Change command behavior | `command.ts`      | `.action()` handler delegates to `src/` |
| Change NPM build        | `build/npm.ts`    | dnt config, import remapping, postBuild |
| Regenerate schema       | `build/schema.ts` | Or `deno task schema`                   |

## Conventions

- `main.ts` safe to import (no side effects) — `import.meta.main` guard
- `parseRepository()` and `RepoArg` defined in `command.ts`, re-exported from `main.ts`
- `npm.ts` patches `deno.json` imports temporarily, always restores in `finally`
- `schema.ts` writes to `.github/labels.schema.json` — committed, auto-generated, don't hand-edit
- Flags: `--token` (env: `GITHUB_TOKEN`), `--config` (default: `.github/labels.yml`), `--dry-run`

## Anti-Patterns

- `cli/help.ts` does NOT exist — dreamcli handles help/completions
- No business logic in `cli/` — delegate to `src/` modules
- Don't use legacy `~/` or `$/` aliases — use `#src/` and `#/`
- `npm/` dir is dnt build output — don't edit directly
