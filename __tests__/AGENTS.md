# AGENTS.md — `__tests__/`

Test suite mirroring `src/` structure.

## Structure

```text
__tests__/
  scripts/
    build_schema_test.ts        # JSON schema generation
  src/
    adapters/
      client/
        base_test.ts            # BaseGitHubClient (testable subclass pattern)
        octokit_test.ts         # OctokitClient with mock Octokit injection
      logger/
        actions_test.ts         # ActionsLogger with mock @actions/core
        console_test.ts         # ConsoleLogger with captureConsole()
    domain/
      labels_test.ts            # LabelColorUtils, LabelNameUtils, label builder
    client_test.ts              # LabelManager.formatError
    config_test.ts              # loadConfig, isLabelConfig, schema validation
    factory_test.ts             # createLogger, createGitHubClient, isGitHubActions
    main_test.ts                # CLI via @kjanat/dreamcli/testkit
    sync_test.ts                # syncLabels orchestration (create/update/delete/rename)
```

## Conventions

- **Naming**: `*_test.ts` (underscore, not dot)
- **API**: flat `Deno.test('name', fn)` — no describe/it nesting
- **Sections**: grouped by `// === Banner ===` comments (some files use `// --- banner ---`)
- **Assertions**: `@std/assert` — `assertEquals`, `assertExists`, `assertRejects`, `assertThrows`,
  `assertStringIncludes`, `assertInstanceOf`, `assertArrayIncludes`
- **Mocks**: hand-rolled from `#src/testing/mod.ts` — `MockGitHubClient`, `NullLogger`,
  `createMockOctokit`, `createMockActionsCore`, `captureConsole`
- **Imports**: `#src/` for source, `#/` for root, `@std/assert` for assertions,
  `@kjanat/dreamcli/testkit` for CLI tests
- **DI**: `MockGitHubClient` + `NullLogger` injected into `LabelManager` / `syncLabels`
- **Testable subclass**: `TestableBaseClient extends BaseGitHubClient` exposes protected methods
- **Factory helpers**: `createTestEnv()` with defaults + overrides
- **Temp files**: `Deno.makeTempFile()` + `try/finally { Deno.remove() }` for cleanup
- **Lifecycle hooks**: `Deno.test.beforeEach` / `afterEach` used sparingly (console_test.ts)

## Where to Look

| Task                | File                                  |
| ------------------- | ------------------------------------- |
| Test sync behavior  | `src/sync_test.ts`                    |
| Test API client     | `src/adapters/client/base_test.ts`    |
| Test Octokit layer  | `src/adapters/client/octokit_test.ts` |
| Test CLI commands   | `src/main_test.ts`                    |
| Test config loading | `src/config_test.ts`                  |
| Test factory/DI     | `src/factory_test.ts`                 |
| Test domain logic   | `src/domain/labels_test.ts`           |
| Test loggers        | `src/adapters/logger/*_test.ts`       |
| Test schema gen     | `scripts/build_schema_test.ts`        |

## Anti-Patterns

- Don't use `describe`/`it` — flat `Deno.test()` only
- Don't use Sinon, jest.fn(), or mocking frameworks — hand-rolled mocks from `src/testing/`
- Don't put test files in `src/` — mirror the path under `__tests__/`
- Don't forget temp file cleanup — always `try/finally { Deno.remove() }`
