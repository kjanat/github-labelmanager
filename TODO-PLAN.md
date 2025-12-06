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
- [x] #13 - Tests - 28 tests in src/config_test.ts
- [x] #14 - Format check - removed continue-on-error

## Refactoring Completed

- Modularized main.ts into src/ modules:
  - `src/types.ts` - All interfaces
  - `src/logger.ts` - Colored logging
  - `src/config.ts` - Config loading and validation
  - `src/client.ts` - LabelManager class
  - `src/sync.ts` - Sync orchestration
  - `src/mod.ts` - Public API exports

- Upgraded Octokit stack:
  - `octokit` - Full SDK with pagination, throttling, retry
  - `@actions/github` - GitHub Actions client (proxy, GHES support)
  - `@octokit/openapi-types` - API schema types

- Restructured adapters into `client/` and `logger/` subdirs:
  - `src/adapters/client/` - GitHub API clients with shared base class
  - `src/adapters/logger/` - Logging implementations
  - Moved interfaces to co-locate with implementations
  - Extracted `BaseGitHubClient` to reduce duplication (~100 lines)
  - Deleted `src/interfaces/` folder

## Remaining Work

### Publishing

- [x] Publish to JSR: `jsr:@kjanat/github-labelmanager` (v1.0.3)
- [x] Publish to NPM: `npm:@kjanat/github-labelmanager` (v1.0.3)
- [x] Create GitHub release with tag
- [x] Add release workflow for JSR/NPM publishing

### Testing

- [x] Add tests for sync.ts (15 tests)
- [x] Add tests for client.ts (6 tests)
- [x] Add test utilities (MockGitHubClient, NullLogger, createTestEnv)
- [ ] Add integration tests (mock GitHub API) - optional, unit tests cover core
      logic

### Documentation

- [ ] Update README with actual published package versions
- [ ] Add CHANGELOG.md
- [x] Add JSDoc to all public exports

### CI/CD

- [ ] Add version bump automation
