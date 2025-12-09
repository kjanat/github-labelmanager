# Copilot instructions

## Project context

- Deno-based GitHub label manager used as a CLI, GitHub Action, and library.
- Default label configuration lives at `.github/labels.yml`.
- Key entry points: `cli/main.ts` (CLI), `src/mod.ts` (library), `action.yml` (Action).
- Import aliases: `~/` → `./src/`, `$/` → `./`.

## Key commands

- Sync labels: `deno task labels OWNER/REPO`
- Dry run sync: `deno task labels:dry-run OWNER/REPO`
- Build/schema generation: `deno task build`
- Type check: `deno check --all`
- Format: `deno fmt`
- Lint: `deno lint`
- Test: `deno task test`

## Code style and conventions

- Use the Deno runtime and APIs (not Node.js).
- Prefer JSR imports for stdlib (`jsr:@std/*`) and npm specifiers for npm packages.
- Define shapes with `interface`; use `as const` for readonly objects.
- Naming: camelCase for variables/functions, PascalCase for types/classes.
- Handle errors with try/catch and Octokit type guards.
- Deno commands require explicit permissions (e.g., `--allow-net`, `--allow-read`, `--allow-env`).

## Architecture map

- `src/domain`: pure business logic (labels, types).
- `src/ports`: interfaces (GitHub client, logger).
- `src/adapters`: infrastructure implementations (clients, loggers).
- `src/testing`: test utilities and fixtures.
- `src/tools`: build/dev utilities.
- High-level orchestration: `src/client.ts`, `src/config.ts`, `src/factory.ts`, `src/schema.ts`, `src/sync.ts`.
