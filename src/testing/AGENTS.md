# src/testing/

Test doubles and fixtures for github-labelmanager — exported in public API for consumers.

## Files

### mocks.ts

- **MockGitHubClient** — full `IGitHubClient` impl with in-memory label state
  - Constructor: `MockGitHubClientOptions` (dryRun, labels, owner, repo)
  - `.labels` — mutable array simulating repo state; mutated by create/update/delete
  - `.errors` — `Partial<Record<method, Error>>`; set to inject failures per-method
  - `.calls` — `ApiCall[]` with method + args; query via `.getCalls(m)`, `.wasCalled(m)`, `.resetCalls()`
  - Dry-run mode returns `null`/void without mutating state
- **MockLogger** — full `ILogger` impl capturing all calls
  - `.calls` — `Array<{method, args}>`; query via `.getCalls(m)`, `.wasCalled(m)`
  - `.failedMessages` — shortcut for `setFailed()` messages
  - `.reset()` — clears both calls and failedMessages

### stubs.ts

- **NullLogger** — no-op `ILogger` impl; silences output, still exercises code paths. No recording.

### fixtures.ts

- **captureConsole()** → `CapturedConsole` — patches `console.*`, returns typed arrays (logs, errors, warns, infos, debugs, all) + `restore()`
- **mockFetch(handler)** → `{calls, restore}` — patches `globalThis.fetch`; handler maps `(url, method, body) → MockFetchResponse`
  - JSON-centric: bodies are JSON.stringify'd, default content-type is `application/json`
  - `.calls` — `FetchCall[]` with url, method, headers, body
- **createMockActionsCore()** → `{core, calls, summary}` — mock `@actions/core` for ActionsLogger tests
  - `summary` — chainable mock (`addHeading`, `addTable`, `addDetails`, `addRaw`, `addList`, `write`)
- **createTestEnv(overrides?)** → `EnvConfig` with test defaults (token, owner, repo, dryRun)
- **createEnvGet(record)** → `(key) => string | undefined`; avoids mutating `Deno.env`
- **createMockOctokit(options?)** → `{octokit, requests}` — mock Octokit for OctokitClient tests
  - Supports route-string paginate only (not function overload)
  - `.errors` record to inject per-route failures

### mod.ts

Barrel export — re-exports all types and classes with JSDoc usage example.

## Conventions

- **Call Recording**: mocks expose `.calls` array; query with `.wasCalled(method)`, `.getCalls(method)`, `.resetCalls()`/`.reset()`
- **Error Injection**: set `mock.errors.create = new Error("boom")` — mock throws on next call to that method
- **Capture-and-Restore**: `captureConsole()` and `mockFetch()` return `restore()` — always call in `try/finally`
- **Full interface impls**: all mocks implement the complete port interface — no partial mocks
- **Hand-rolled**: no mocking frameworks (no Sinon, no `mock.fn()`, no `spy()`)

## Anti-Patterns

- Don't use mocking frameworks — project convention is hand-rolled interface implementations
- Don't forget `restore()` — leaked global patches (console, fetch) break other tests
- Don't use `mockFetch` for non-JSON responses — it JSON.stringify's everything
- Don't use function-overload `paginate` with `createMockOctokit` — only route-string form is mocked
