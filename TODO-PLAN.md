# Pre-Launch TODO Plan

## Completed

- [x] #1 - Unhandled main() promise - fixed with try/catch in main.ts
- [x] #2 - Docker config path - uses CONFIG_PATH env
- [x] #3 - CRUD errors swallowed - errors tracked in SyncResult
- [x] #4 - List failure returns empty - now throws to caller
- [x] #5 - CONFIG_PATH input - now used via getEnv()
- [x] #6 - YAML schema validation - isLabelConfig() type guard
- [x] #7 - Unsafe owner/repo split - validated in getEnv()
- [x] #8 - README claims - packages now published
- [x] #9 - Pin Docker version - denoland/deno:2.5.6
- [x] #10 - Scope Deno permissions - scoped in deno.json tasks
- [x] #11 - Rate limit handling - @octokit/plugin-throttling
- [x] #12 - labels:dry-run task - accepts OWNER/REPO argument
- [x] #13 - Tests - 187 tests passing
- [x] #14 - Format check - removed continue-on-error

## Architecture Refactoring Completed

- Restructured to Clean Architecture / Hexagonal Architecture:
  - `src/domain/` - Pure business logic (labels, types)
  - `src/ports/` - Interface contracts (IGitHubClient, ILogger)
  - `src/adapters/` - Infrastructure implementations
  - `src/testing/` - Test utilities (mocks, stubs, fixtures)
  - `src/tools/` - Build/dev utilities
  - `cli/` - CLI entry point and build scripts

- Upgraded Octokit stack:
  - `octokit` - Full SDK with pagination, throttling, retry
  - `@actions/github` - GitHub Actions client (proxy, GHES support)
  - `@octokit/openapi-types` - API schema types

- Extracted shared code:
  - `BaseGitHubClient` - shared CRUD logic (~100 lines saved)
  - `cli/help.ts` - CLI help text separated from library code
  - Barrel exports (`mod.ts`) for clean imports

## Publishing

- [x] Publish to JSR: `jsr:@kjanat/github-labelmanager` (v1.1.0)
- [x] Publish to NPM: `npm:@kjanat/github-labelmanager` (v1.1.0)
- [x] Create GitHub release with tag
- [x] Add release workflow for JSR/NPM publishing

## Testing

- [x] Add tests for sync.ts (15 tests)
- [x] Add tests for client.ts (6 tests)
- [x] Add test utilities (MockGitHubClient, NullLogger, createTestEnv)
- [ ] Add integration tests (mock GitHub API) - optional

## Documentation

- [x] Update README with actual published package versions
- [x] Create platform-specific READMEs (JSR_README.md, NPM_README.md)
- [x] Update AGENTS.md with new structure
- [x] Add JSDoc to all public exports
- [ ] Add CHANGELOG.md

## CI/CD

- [ ] Add version bump automation
