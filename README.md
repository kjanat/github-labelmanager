# github-labelmanager

[![CI](https://github.com/kjanat/github-labelmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/kjanat/github-labelmanager/actions/workflows/ci.yml)
[![Docker](https://github.com/kjanat/github-labelmanager/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/kjanat/github-labelmanager/actions/workflows/docker-publish.yml)
[![JSR](https://jsr.io/badges/@kjanat/github-labelmanager)](https://jsr.io/@kjanat/github-labelmanager)
[![JSR Score](https://jsr.io/badges/@kjanat/github-labelmanager/score)](https://jsr.io/@kjanat/github-labelmanager)
[![NPM](https://img.shields.io/npm/v/@kjanat/github-labelmanager)](https://www.npmjs.com/package/@kjanat/github-labelmanager)

Declaratively sync GitHub issue labels from a YAML config file.

---

## Features

- Create, update, and delete labels from a single config file
- Rename labels via aliases (preserves issue associations)
- Dry-run mode for safe previews
- Works as CLI or GitHub Action

---

## Install

### Deno

```sh
deno install -Agn github-labelmanager jsr:@kjanat/github-labelmanager/cli
```

### npm

```sh
npm install -g @kjanat/github-labelmanager
```

### Docker

```sh
docker pull ghcr.io/kjanat/github-labelmanager:latest
```

---

## Use as CLI

```sh
GITHUB_TOKEN=ghp_xxx github-labelmanager owner/repo
```

Preview changes without applying:

```sh
github-labelmanager owner/repo --dry-run
```

<details>
<summary>Alternative ways to run</summary>

**npx (without installing)**

```sh
GITHUB_TOKEN=ghp_xxx npx @kjanat/github-labelmanager owner/repo
```

**Deno (without installing)**

```sh
GITHUB_TOKEN=ghp_xxx deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo
```

**Docker**

```sh
docker run --rm -e GITHUB_TOKEN=ghp_xxx -v $(pwd)/.github:/app/.github ghcr.io/kjanat/github-labelmanager owner/repo
```

</details>

---

## Use as GitHub Action

```yaml
name: Sync Labels
on:
  push:
    paths:
      - ".github/labels.yml"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: kjanat/github-labelmanager@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input         | Required | Default              | Description                    |
| ------------- | -------- | -------------------- | ------------------------------ |
| `token`       | Yes      | -                    | GitHub token with repo access  |
| `repository`  | No       | `github.repository`  | Target repo in `owner/repo`    |
| `dry-run`     | No       | `false`              | Preview without making changes |
| `config-path` | No       | `.github/labels.yml` | Path to label config file      |

---

## Configure

Create `.github/labels.yml` in your repository:

```yaml
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
    aliases: [documentation]

delete:
  - obsolete-label
  - another-old-label
```

### Label schema

| Field         | Required | Description                     |
| ------------- | -------- | ------------------------------- |
| `name`        | Yes      | Label name                      |
| `color`       | Yes      | Hex color (with or without `#`) |
| `description` | Yes      | Short description               |
| `aliases`     | No       | Old names to rename from        |

### Delete labels

Add label names to the `delete` array to remove them.

---

## Environment variables

| Variable       | Required | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `GITHUB_TOKEN` | Yes      | Personal access token or `secrets.GITHUB_TOKEN` |
| `REPO`         | No       | Fallback if not passed as argument              |
| `DRY_RUN`      | No       | Set to `true` for dry-run mode                  |

---

## Development

```sh
# Run locally
deno task labels owner/repo

# Dry run
deno task labels:dry-run owner/repo

# Type check
deno check --all

# Format
deno fmt

# Lint
deno lint

# Build npm package
deno task build
```

---

## License

MIT
