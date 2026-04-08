# src/ports/

Port interfaces for dependency inversion. Contracts only, no implementations.

## Files

| File        | Contents                                                                          |
| ----------- | --------------------------------------------------------------------------------- |
| `github.ts` | `IGitHubClient` (CRUD: create/get/list/update/delete), `GitHubClientConfig`,      |
|             | `LabelOptions`, `GitHubLabel`, `GitHubLabelSchema`, `OctokitLike` union type      |
| `logger.ts` | `ILogger` (debug/info/warn/error/notice/success/skip/setFailed, group collapsing, |
|             | `writeSummary`), `AnnotationProperties`                                           |
| `mod.ts`    | Barrel re-export of both files                                                    |

## Conventions

- **Interfaces only** — implementations live in `src/adapters/`
- Mocks for testing live in `src/testing/`
- `IGitHubClient` has readonly `owner`, `repo`, `isDryRun` properties
- `ILogger` spans both CLI (colored console) and GitHub Actions (annotations + workflow commands)
- `logger.ts` imports `SyncResult` from domain — only domain type dependency allowed

## Where to Look

| Task                    | File        | What to do                                     |
| ----------------------- | ----------- | ---------------------------------------------- |
| Add GitHub API method   | `github.ts` | Add method to `IGitHubClient`, update adapters |
| Add log level           | `logger.ts` | Add method to `ILogger`, update adapters       |
| Change label API shape  | `github.ts` | Update `LabelOptions` or `GitHubLabel`         |
| Add annotation metadata | `logger.ts` | Extend `AnnotationProperties`                  |

## Anti-Patterns

- Don't add implementations — ports are contracts only
- Don't import from `adapters/` — ports depend on domain types at most
- Don't add runtime logic or utility functions
