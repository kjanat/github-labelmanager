# AGENTS.md

## Commands

- Run: `deno task labels OWNER/REPO`
- Dry run: `deno task labels:dry-run OWNER/REPO`
- Build: `deno task build`
- Type check: `deno check --all`
- Format: `deno fmt`
- Lint: `deno lint`
- Test: `deno task test`

## Code Style

- Deno runtime (not Node.js) - use Deno APIs
- Imports: JSR (`jsr:@std/*`) for stdlib, npm specifiers for npm packages
- Types: `interface` for shapes, `as const` for readonly objects
- Naming: camelCase (vars/funcs), PascalCase (types/classes)
- Error handling: try/catch with type guards for Octokit errors
- Permissions: explicit flags required (`--allow-net`, `--allow-read`,
  `--allow-env`)

## Provides

- GitHub Action: `kjanat/github-labelmanager@v1`
- JSR package: `jsr:@kjanat/github-labelmanager`
- NPM package: `npm:@kjanat/github-labelmanager`
- Docker image: `ghcr.io/kjanat/github-labelmanager`

## Config

- Default config: `.github/labels.yml` (YAML format)
- CLI entry point: `cli/main.ts`
- Library entry point: `src/mod.ts`

## Structure

```tree
cli/
  build/
    npm.ts             # NPM package build script
    schema.ts          # JSON schema generation
  help.ts              # CLI help text and printHelp()
  main.ts              # CLI entry point

src/
  domain/              # Pure business logic (no dependencies)
    labels.ts          # LabelDefinition, LabelColorUtils, LabelNameUtils
    types.ts           # LabelConfig, SyncResult, SyncCounts
    mod.ts             # Barrel export

  ports/               # Interface contracts (dependency inversion)
    github.ts          # IGitHubClient, GitHubClientConfig, LabelOptions
    logger.ts          # ILogger, AnnotationProperties
    mod.ts             # Barrel export

  adapters/            # Infrastructure implementations
    client/            # GitHub API clients
      mod.ts           # Barrel exports
      base.ts          # BaseGitHubClient (shared CRUD logic)
      actions.ts       # ActionsGitHubClient (CI: proxy, GHES support)
      octokit.ts       # OctokitClient (CLI: throttling, retry)
    logger/            # Logging adapters
      mod.ts           # Barrel exports
      actions.ts       # ActionsLogger (@actions/core)
      console.ts       # ConsoleLogger (colored CLI output)

  testing/             # Test utilities
    mocks.ts           # MockGitHubClient, MockLogger
    stubs.ts           # NullLogger, env stubs
    fixtures.ts        # Test fixtures, mock helpers
    mod.ts             # Barrel export

  tools/               # Build/dev utilities
    sort-schema.ts     # JSON schema sorter
    mod.ts             # Barrel export

  client.ts            # LabelManager (high-level API with DI)
  config.ts            # Config loading and validation
  factory.ts           # Environment detection, service creation
  schema.ts            # JSON schema validation
  sync.ts              # Label sync orchestration
  mod.ts               # Public API exports
```

## Repository

- name: `github-labelmanager`
- owner: `kjanat`
- url: `https://github.com/kjanat/github-labelmanager`

## Import Aliases

- `~/` - maps to `./src/`
- `$/` - maps to `./` (project root)

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

- `git add`, `git commit`, `git push`
- `git stash`, `git merge`, `git rebase`, `git cherry-pick`
- `git checkout --` / `git restore` (discards changes)
- File deletion (`rm`, `git rm`)
- Installing dependencies (`npm install`, `deno add`, `pip install`)

### Default to Read-Only

Prefer: `read`, `glob`, `grep`, `git status`, `git diff`, `git log`

### If You Make a Mistake

1. Stop immediately
2. Run `git reflog` to show recovery options
3. Explain what happened
4. Do NOT attempt automated recovery without approval
