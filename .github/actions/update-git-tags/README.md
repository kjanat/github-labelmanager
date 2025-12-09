# Update Git Tags Action

Updates major and minor version tags for GitHub Action releases, following
[action versioning best practices](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md).

## Features

- Updates major version tags (e.g., `v1` -> `v1.2.3`)
- Updates minor version tags (e.g., `v1.2` -> `v1.2.3`)
- Auto-detects version files (package.json, deno.json, jsr.json)
- Skips tag updates for prerelease versions
- Dual-mode: works in CI and as interactive CLI

## Usage

### GitHub Actions (CI Mode)

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v6
    with:
      fetch-depth: 0 # Required for tag operations

  - name: Update Tags
    uses: kjanat/github-labelmanager/.github/actions/update-git-tags@v1
    with:
      tag: v1.2.3
      major: true
      minor: true
```

### Local CLI (Interactive Mode)

```bash
cd /path/to/repo
./.github/actions/update-git-tags/entrypoint.sh
# Prompts for tag input interactively
```

## Inputs

| Input           | Description                                     | Required | Default |
| --------------- | ----------------------------------------------- | -------- | ------- |
| `tag`           | Version tag to process (e.g., `v1.2.3`)         | Yes      | -       |
| `major`         | Update major version tag (e.g., `v1`)           | No       | `true`  |
| `minor`         | Update minor version tag (e.g., `v1.2`)         | No       | `false` |
| `create-branch` | Create `releases/vX` branch for major releases  | No       | `false` |
| `version-file`  | Path to version file, `auto`, `none`, or `skip` | No       | `auto`  |

### Version File Detection

When `version-file` is `auto` (default), the action searches for:

1. `package.json`
2. `deno.json`
3. `deno.jsonc`
4. `jsr.json`
5. `jsr.jsonc`

Set to `none` or `skip` to disable version validation.

## Outputs

| Output             | Description                          |
| ------------------ | ------------------------------------ |
| `major-tag`        | Major version tag that was updated   |
| `minor-tag`        | Minor version tag that was updated   |
| `is-major-release` | Whether this was a new major version |

## Prerelease Handling

Prerelease versions (e.g., `v1.2.3-beta.1`) are detected automatically. Major
and minor tags are **not** updated for prereleases to avoid pointing stable tags
at unstable code.

## Requirements

The workflow using this action must:

1. **Checkout with full history** for tag operations:

   ```yaml
   - uses: actions/checkout@v6
     with:
       fetch-depth: 0
   ```

2. **Have write permissions** for pushing tags:

   ```yaml
   permissions:
     contents: write
   ```

## Examples

### Basic Usage

```yaml
- uses: kjanat/github-labelmanager/.github/actions/update-git-tags@v1
  with:
    tag: ${{ github.ref_name }}
```

### With All Options

```yaml
- uses: kjanat/github-labelmanager/.github/actions/update-git-tags@v1
  with:
    tag: ${{ github.ref_name }}
    major: true
    minor: true
    create-branch: true
    version-file: deno.json
```

### Skip Version Validation

```yaml
- uses: kjanat/github-labelmanager/.github/actions/update-git-tags@v1
  with:
    tag: v1.0.0
    version-file: none
```

## License

MIT - See [LICENSE](LICENSE)
