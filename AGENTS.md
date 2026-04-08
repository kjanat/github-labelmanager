# AGENTS.md

GitHub label manager: sync labels from YAML config to repos. Deno + TypeScript.
Hexagonal architecture (ports/adapters). Ships as GitHub Action, JSR, NPM, Docker.

## Commands

- Run: `deno task labels OWNER/REPO`
- Dry run: `deno task labels:dry-run OWNER/REPO`
- Build NPM: `deno task build`
- Type check: `deno check --all`
- Format: `dprint fmt` / `dprint fmt $FILE` / `dprint check`
- Lint: `deno lint`
- Test: `deno task test`
- Schema: `deno task schema`
- Compile: `deno task compile`

## Structure

```text
cli/                  # CLI driving adapter (@kjanat/dreamcli)
src/
  domain/             # Pure types + value objects (zero deps)
  ports/              # Interface contracts (IGitHubClient, ILogger)
  adapters/           # Infrastructure (GitHub API clients, loggers)
  testing/            # Mocks, stubs, fixtures (exported in public API)
  tools/              # Build utilities (schema sorter)
  client.ts           # LabelManager facade (high-level API with DI)
  config.ts           # YAML config loading + validation
  factory.ts          # Environment-sniffing service creation
  schema.ts           # JSON schema from Zod types
  sync.ts             # Label sync orchestration
  mod.ts              # Public API barrel
__tests__/            # Mirrors src/ structure, _test.ts suffix
specs/                # Planning docs + backlog (not built/published)
.github/actions/      # 6 CI helper actions (own toolchains, NOT Deno)
```

## Where to Look

| Task                      | Location                                | Notes                                 |
| ------------------------- | --------------------------------------- | ------------------------------------- |
| Add label sync behavior   | `src/sync.ts`                           | Core orchestration                    |
| Add new GitHub API call   | `src/adapters/client/base.ts`           | Shared CRUD, subclassed by impls      |
| Change CLI interface      | `cli/main.ts`                           | Uses `@kjanat/dreamcli`               |
| Add config option         | `src/domain/types.ts` + `src/schema.ts` | Type + Zod schema + regenerate        |
| Add test                  | `__tests__/src/` (mirror path)          | Flat `Deno.test()`, hand-rolled mocks |
| Change GitHub Action      | `action.yml`                            | Composite, installs Deno at runtime   |
| Modify label color logic  | `src/domain/labels.ts`                  | `LabelColorUtils`, `LabelNameUtils`   |
| Change environment detect | `src/factory.ts`                        | Reads `GITHUB_ACTIONS` env var        |

## Code Style

- **Runtime**: Deno (not Node.js) — use Deno APIs exclusively
- **Imports**: `#src/` alias for `./src/`, `#/` for root. JSR (`jsr:@std/*`) for stdlib, `npm:` for npm
- **Types**: `interface` for shapes, `as const` for readonly. No `any`, no `!`, no `as Type`
- **Naming**: camelCase (vars/funcs), PascalCase (types/classes)
- **Formatting**: dprint (tabs, 120 cols, single quotes, LF). NOT `deno fmt`
- **Barrel exports**: every directory boundary has `mod.ts`
- **Permissions**: explicit flags required (`--allow-net=api.github.com`, `-RE`)

## Anti-Patterns

- `cli/help.ts` in tree above does NOT exist — CLI uses dreamcli for help
- Import aliases `~/` and `$/` are legacy (tsconfig only) — actual code uses `#src/` and `#/`
- `delete` field in label config is DEPRECATED (v2 uses declarative sync)
- Don't add Node.js APIs, dotenv, or bare import specifiers
- `npm/` dir is dnt build output — don't edit directly

## Provides

| Target        | Identifier                           |
| ------------- | ------------------------------------ |
| GitHub Action | `kjanat/github-labelmanager@v1`      |
| JSR           | `jsr:@kjanat/github-labelmanager`    |
| NPM           | `npm:@kjanat/github-labelmanager`    |
| Docker        | `ghcr.io/kjanat/github-labelmanager` |

## Config

- Default config: `.github/labels.yml` (YAML)
- Schema: `.github/labels.schema.json` (auto-generated from Zod, do not edit)
- CLI entry: `cli/main.ts` (guarded by `import.meta.main`)
- Library entry: `src/mod.ts`

## Git Operations

### Required Workflow for All Git Write Commands

Before `git add`, `git commit`, or `git push`:

1. Run `git status` and `git diff`
2. Show the user exactly what will change
3. State your intended action: "I will stage these 3 files"
4. Ask: "Proceed? (yes/no)"
5. Execute ONLY if user responds: "yes", "do it", "go ahead", "commit", "push",
   or "approved"

Phrases that are NOT approval: "ok", "sure", "whatever", "sounds good", "I
guess"

### Prohibited Commands (No Exceptions)

Never execute, even if requested:

- `git reset --hard`
- `git push --force` / `git push -f` / `git push origin +branch`
- `git clean -f`
- `git branch -D`
- `git stash drop`
- `rm -rf`

If user requests these, explain the risk and suggest safer alternatives.

### Require Approval Each Time

- `git stash`, `git merge`, `git rebase`, `git cherry-pick`
- `git checkout --` / `git restore` (discards changes)
- File deletion (`rm`, `git rm`)

### Default to Read-Only

Prefer: `read`, `glob`, `grep`, `git status`, `git diff`, `git log`

### If You Make a Mistake

1. Stop immediately
2. Run `git reflog` to show recovery options
3. Explain what happened
4. Do NOT attempt automated recovery without approval

## Repository

- name: `github-labelmanager`
- owner: `kjanat`
- url: `https://github.com/kjanat/github-labelmanager`
- default branch: `master`
