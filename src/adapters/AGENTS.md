# adapters/

Infrastructure implementations of port interfaces (`IGitHubClient`, `ILogger`).

## Structure

```text
client/
  base.ts       # Abstract base — shared CRUD (get/create/update/delete), template method
  actions.ts    # ActionsGitHubClient — @actions/github, proxy/GHES support, no throttling
  octokit.ts    # OctokitClient — canonical octokit, throttle + retry plugins, rate limit handling
  mod.ts        # Barrel — re-exports port types + both impls + base class
logger/
  actions.ts    # ActionsLogger — @actions/core wrappers, annotations, job summaries, collapsible groups
  console.ts    # ConsoleLogger — ANSI colors, Deno.noColor respect, injectable exit fn
  mod.ts        # Barrel — re-exports ILogger + AnnotationProperties + both impls
```

No top-level `mod.ts` — consumers import from `client/mod.ts` or `logger/mod.ts` directly.

## Where to Look

| Task                           | File                                       | Notes                                                          |
| ------------------------------ | ------------------------------------------ | -------------------------------------------------------------- |
| Add GitHub API method          | `client/base.ts`                           | Add to abstract class; subclasses inherit                      |
| Override pagination/connection | `client/actions.ts` or `client/octokit.ts` | `list()` differs per octokit variant                           |
| Change CI log output           | `logger/actions.ts`                        | Wraps `@actions/core`; `ActionsCore` interface for testability |
| Change CLI log output          | `logger/console.ts`                        | ANSI colorize, group indentation                               |
| Add job summary content        | `logger/actions.ts`                        | `writeSummary()` — builds markdown tables via `core.summary`   |
| Extend logger interface        | `ports/logger.ts`                          | Then implement in **both** logger adapters                     |
| Extend client interface        | `ports/github.ts`                          | Then implement in `base.ts` (or abstract + both subclasses)    |

## Conventions

- **Strategy pattern**: `factory.ts` selects Actions vs CLI impl at runtime based on `GITHUB_ACTIONS` env
- **Template method**: `BaseGitHubClient` is abstract — provides `get`/`create`/`update`/`delete`; subclasses must implement `list()` (paginate APIs differ between `@actions/github` and `octokit`)
- **Testability**: both adapters accept injected dependencies (`ActionsCore` interface, optional `Octokit` instance, injectable `exitFn`)
- **Barrel re-exports**: each `mod.ts` re-exports port types for consumer convenience
- **Dry-run**: client `create`/`update`/`delete` check `isDryRun` and log instead of mutating
- `ConsoleLogger.writeSummary()` is a no-op — CLI prints inline during sync

## Anti-Patterns

- Don't add adapter without implementing full port interface (`IGitHubClient` or `ILogger`)
- Don't put sync/business logic here — belongs in `sync.ts` or `domain/`
- Don't use `@actions/core` directly outside `logger/actions.ts` — go through `ILogger`
- Don't add a third client impl without updating `factory.ts` selection logic
