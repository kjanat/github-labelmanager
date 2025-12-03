# github-labelmanager

[![CI][badge:ci]][actions:ci] [![Docker][badge:ci:docker]][actions:docker]
[![JSR Version][badge:jsr:@kjanat/github-labelmanager]][jsr:@kjanat/github-labelmanager]
[![NPM Version][badge:npm:@kjanat/github-labelmanager]][npm:@kjanat/github-labelmanager]

<!-- [![JSR Score][badge:jsr:score]][jsr:@kjanat/github-labelmanager] -->

Declaratively sync GitHub issue labels from a YAML config file.

---

## Features

- Create, update, and delete labels from a single config file
- Rename labels via aliases (preserves issue associations)
- Dry-run mode for safe previews
- Works as CLI or GitHub Action

---

## Install / Run

### Deno

```bash
# Install globally
deno install -Agn github-labelmanager jsr:@kjanat/github-labelmanager/cli

# Run
deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo
```

### npm

```bash
# Install globally
npm install -g @kjanat/github-labelmanager

# Run
npx -y @kjanat/github-labelmanager owner/repo
```

### Docker

```bash
# Pull the image
docker pull ghcr.io/kjanat/github-labelmanager:latest

# Run
docker run --rm \
  -e GITHUB_TOKEN=ghp_xxx \
  -v $(git rev-parse --show-toplevel)/.github:/app/.github \
  ghcr.io/kjanat/github-labelmanager owner/repo
```

---

## Use as CLI

```bash
GITHUB_TOKEN=ghp_xxx github-labelmanager owner/repo
```

Preview changes without applying:

```bash
github-labelmanager owner/repo --dry-run
```

<details>
<summary>Alternative ways to run</summary>

> **npx (without installing)**
>
> ```bash
> GITHUB_TOKEN=ghp_xxx npx -y @kjanat/github-labelmanager owner/repo
> ```

> **Deno (without installing)**
>
> ```bash
> GITHUB_TOKEN=ghp_xxx deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo
> ```

> **Docker**
>
> ```bash
> docker run --rm -e GITHUB_TOKEN=ghp_xxx -v $(pwd)/.github:/app/.github ghcr.io/kjanat/github-labelmanager owner/repo
> ```

</details>

---

## Use as GitHub Action

```yaml
name: Sync Labels
on:
  push:
    # Optional: trigger only when the labels file changes
    # This will however not sync manually modified labels through the GitHub UI
    paths:
      - ".github/labels.yml"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v6
      - uses: kjanat/github-labelmanager@v1
        with:
          token: ${{ github.token }}
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

Create [`.github/labels.yml`][labels.yml] in your repository:

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
[labels.yml]: https://github.com/kjanat/github-labelmanager/blob/master/.github/labels.yml "Click to view this repository's label configuration"

<!--
markdownlint-configure-file {
  "no-blanks-blockquote": false,
  "no-inline-html": false
}
-->
