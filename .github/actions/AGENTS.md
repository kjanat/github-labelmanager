# .github/actions/

6 CI helper actions — isolated mini-projects with own toolchains (NOT Deno).

## Structure

| Action                  | Runtime                | Purpose                                                |
| ----------------------- | ---------------------- | ------------------------------------------------------ |
| `check-schema-outdated` | node24, tsdown         | Regenerates schema, diffs to detect staleness          |
| `comment-pkg-pr`        | node24, tsdown         | Posts/updates PR comments with pkg-pr-new URLs         |
| `publish-npm`           | composite/bash         | Publishes NPM package with provenance (`npm.sh`)       |
| `release-validate`      | composite/bash         | Validates git tag vs deno.json version (`validate.sh`) |
| `setup-deno`            | composite              | Installs Deno + optional Node/Bun + dependency caching |
| `update-git-tags`       | Docker (alpine:3.23.0) | Updates major/minor floating tags (`entrypoint.sh`)    |

Shared configs at this level: `tsconfig.base.json`, `eslint.config.base.mjs`, `.prettierignore`.

## Conventions

- **Excluded from main project** lint/fmt/test — these are self-contained
- node24 actions have own `tsdown.config.ts` + `eslint.config.mjs` extending `eslint.config.base.mjs`
- Bash actions use shell scripts directly (`validate.sh`, `npm.sh`)
- Docker action has own `Dockerfile` (alpine + bash/git/jq, non-root user)
- `comment-pkg-pr` has own `CLAUDE.md` (Bun-oriented, but action runs on node24)

## Anti-Patterns

- Don't apply main project conventions (dprint, deno lint) here
- Don't assume Deno runtime — these use Node.js, Bun, or bash
- `update-git-tags` is not referenced by any workflow (dead infrastructure?)
