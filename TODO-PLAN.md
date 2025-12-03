# Pre-Launch TODO Plan

## Completed

- [x] #1 - Unhandled main() promise - fixed with try/catch in main.ts
- [x] #2 - Docker config path - uses CONFIG_PATH env
- [x] #3 - CRUD errors swallowed - errors tracked in SyncResult
- [x] #4 - List failure returns empty - now throws to caller
- [x] #5 - CONFIG_PATH input - now used via getEnv()
- [x] #6 - YAML schema validation - isLabelConfig() type guard
- [x] #7 - Unsafe owner/repo split - validated in getEnv()
- [x] #8 - README claims - marked packages as "Coming Soon"
- [x] #9 - Pin Docker version - denoland/deno:2.5.6
- [x] #10 - Scope Deno permissions - scoped in deno.json tasks
- [x] #11 - Rate limit handling - @octokit/plugin-throttling
- [x] #12 - labels:dry-run task - accepts OWNER/REPO argument
- [x] #13 - Tests - 18 tests in src/config_test.ts
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
  - `@octokit/rest` - Built-in pagination
  - `@octokit/plugin-throttling` - Rate limit handling
  - `@octokit/auth-action` - GitHub Actions auth
  - `@octokit/types` / `@octokit/openapi-types` - Proper typing

## Remaining Work

### Publishing

- [ ] Publish to JSR: `jsr:@kjanat/github-labelmanager`
- [ ] Publish to NPM: `npm:@kjanat/github-labelmanager`
- [ ] Create GitHub release with tag

### Testing

- [ ] Add integration tests (mock GitHub API)
- [ ] Add tests for sync.ts
- [ ] Add tests for client.ts

### Documentation

- [ ] Update README with actual published package versions
- [ ] Add CHANGELOG.md
- [ ] Add JSDoc to all public exports

### CI/CD

- [ ] Add release workflow for JSR/NPM publishing
- [ ] Add version bump automation
