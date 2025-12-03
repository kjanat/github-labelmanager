# AGENTS.md

## Commands

- Run: `deno task labels OWNER/REPO`
- Dry run: `deno task labels:dry-run OWNER/REPO`
- Build: `deno task build`
- Type check: `deno check --all`
- Format: `deno fmt`
- Lint: `deno lint`
- No tests exist yet

## Code Style

- Deno runtime (not Node.js) - use Deno APIs
- Imports: JSR (`jsr:@std/*`) for stdlib, esm.sh for npm packages
- Types: `interface` for shapes, `as const` for readonly objects
- Naming: camelCase (vars/funcs), PascalCase (types/classes)
- Error handling: try/catch with type guards for Octokit errors
- Permissions: explicit flags required (`--allow-net`, `--allow-read`,
  `--allow-env`)

## Provides

- GitHub Action (`action.yml`): # - uses:
  `kjanat/github-labelmanager@v\d+(\.\d+){0,2}`
- In future:
  - CLI tool: `github-labelmanager`
  - JSR package: `jsr:@kjanat/github-labelmanager`
  - NPM package: `npm:@kjanat/github-labelmanager`

## Config

- Default config: `.github/labels.yml` (YAML format)
- Entry point: `main.ts`

## Repository

- name: `github-labelmanager`
- owner: `kjanat`
- url: `https://github.com/kjanat/github-labelmanager`
