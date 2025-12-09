# github-labelmanager

[![CI][badge:ci]][actions:ci] [![Docker][badge:ci:docker]][actions:docker]
[![JSR Version][badge:jsr:@kjanat/github-labelmanager]][jsr:@kjanat/github-labelmanager]
[![NPM Version][badge:npm:@kjanat/github-labelmanager]][npm:@kjanat/github-labelmanager]
[![pkg.pr.new][badge:pkg.pr.new]][pkg.pr.new]

Declaratively sync GitHub issue labels from a YAML config file.

## Features

- Create, update, and delete labels from a single config file
- Rename labels via aliases (preserves issue associations)
- Dry-run mode for safe previews
- Works as CLI, GitHub Action, or library
- Clean Architecture with dependency injection

## Quick Start

### GitHub Action

```yaml
name: Sync Labels
on:
  push:
    paths: [".github/labels.yml"]
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: kjanat/github-labelmanager@v1
        with:
          token: ${{ github.token }}
```

### CLI

```bash
# Deno
deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo

# npm
npx @kjanat/github-labelmanager owner/repo

# Docker
docker run --rm -e GITHUB_TOKEN=ghp_xxx \
  -v $(pwd)/.github:/app/.github \
  ghcr.io/kjanat/github-labelmanager owner/repo
```

## Installation

### Deno

```bash
deno install -Agn github-labelmanager jsr:@kjanat/github-labelmanager/cli
```

### npm

```bash
npm install -g @kjanat/github-labelmanager
```

### Docker

```bash
docker pull ghcr.io/kjanat/github-labelmanager:latest
```

## Configuration

Create `.github/labels.yml` in your repository:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/kjanat/github-labelmanager/master/.github/labels.schema.json
---
labels:
  - name: bug
    color: "#d73a4a"
    description: Something isn't working

  - name: feature
    color: "#a2eeef"
    description: New feature or request
    aliases: [enhancement] # Renames 'enhancement' to 'feature'

  - name: docs
    color: "#0075ca"
    description: Documentation improvements

delete:
  - obsolete-label
```

### Label Schema

| Field         | Required | Description                     |
| ------------- | -------- | ------------------------------- |
| `name`        | Yes      | Label name                      |
| `color`       | Yes      | Hex color (with or without `#`) |
| `description` | Yes      | Short description               |
| `aliases`     | No       | Old names to rename from        |

## GitHub Action

### Inputs

| Input         | Required | Default              | Description                    |
| ------------- | -------- | -------------------- | ------------------------------ |
| `token`       | No       | `github.token`       | GitHub token with repo access  |
| `repository`  | No       | `github.repository`  | Target repo in `owner/repo`    |
| `dry-run`     | No       | `false`              | Preview without making changes |
| `config-path` | No       | `.github/labels.yml` | Path to label config file      |

## CLI Usage

```bash
# Set token
export GITHUB_TOKEN=ghp_xxx

# Sync labels
github-labelmanager owner/repo

# Preview changes
github-labelmanager owner/repo --dry-run

# Custom config
github-labelmanager owner/repo --config ./labels.yml
```

### Environment Variables

| Variable       | Required | Description                             |
| -------------- | -------- | --------------------------------------- |
| `GITHUB_TOKEN` | Yes      | Personal access token or `github.token` |
| `REPO`         | No       | Fallback if not passed as argument      |
| `DRY_RUN`      | No       | Set to `true` for dry-run mode          |
| `CONFIG_PATH`  | No       | Path to config file                     |

## Library Usage

```typescript
import {
  LabelManager,
  loadConfig,
  syncLabels,
} from "@kjanat/github-labelmanager";

const config = await loadConfig(".github/labels.yml");
const manager = new LabelManager({
  token: Deno.env.get("GITHUB_TOKEN")!,
  owner: "owner",
  repo: "repo",
  dryRun: false,
});

const result = await syncLabels(manager, config);
console.log(result.summary);
```

See [JSR docs][jsr:@kjanat/github-labelmanager] for full API reference.

## Architecture

```
cli/                    # CLI entry point and build scripts
src/
  domain/               # Pure business logic (labels, types)
  ports/                # Interface contracts (IGitHubClient, ILogger)
  adapters/             # Infrastructure implementations
    client/             # GitHub API clients (Actions, Octokit)
    logger/             # Logging (Actions, Console)
  testing/              # Test utilities (mocks, stubs, fixtures)
  client.ts             # LabelManager (high-level API)
  config.ts             # Config loading and validation
  factory.ts            # Service creation and DI
  sync.ts               # Label sync orchestration
  mod.ts                # Public API exports
```

## Development

```bash
# Run locally
deno task labels owner/repo

# Dry run
deno task labels:dry-run owner/repo

# Type check
deno check --all

# Format & Lint
deno fmt && deno lint

# Test
deno task test

# Build npm package
deno task build
```

## License

[MIT][license]

<!-- link definitions -->

[license]: https://github.com/kjanat/github-labelmanager/blob/master/LICENSE
[actions:ci]: https://github.com/kjanat/github-labelmanager/actions/workflows/ci.yml
[actions:docker]: https://github.com/kjanat/github-labelmanager/actions/workflows/docker-publish.yml
[badge:ci]: https://img.shields.io/github/actions/workflow/status/kjanat/github-labelmanager/ci.yml?logo=githubactions&logoColor=2088FF&logoSize=auto&label=CI&labelColor=181717
[badge:ci:docker]: https://img.shields.io/github/actions/workflow/status/kjanat/github-labelmanager/docker-publish.yml?logo=githubactions&logoColor=2088FF&logoSize=auto&label=Docker&labelColor=181717
[badge:jsr:@kjanat/github-labelmanager]: https://img.shields.io/jsr/v/@kjanat/github-labelmanager?logo=jsr&logoColor=black&logoSize=auto&label=&labelColor=F7DF1E&color=black
[badge:npm:@kjanat/github-labelmanager]: https://img.shields.io/npm/v/@kjanat/github-labelmanager?logo=npm&logoColor=white&logoSize=auto&label=&labelColor=CB3837&color=black
[jsr:@kjanat/github-labelmanager]: https://jsr.io/@kjanat/github-labelmanager
[npm:@kjanat/github-labelmanager]: https://www.npmjs.com/package/@kjanat/github-labelmanager
[badge:pkg.pr.new]: https://pkg.pr.new/badge/kjanat/github-labelmanager
[pkg.pr.new]: https://pkg.pr.new/~/kjanat/github-labelmanager
