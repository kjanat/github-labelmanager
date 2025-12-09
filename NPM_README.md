# @kjanat/github-labelmanager

Declaratively sync GitHub issue labels from a YAML config file.

## Installation

```bash
npm install @kjanat/github-labelmanager
```

## CLI Usage

```bash
# Run with npx
npx @kjanat/github-labelmanager owner/repo

# Or install globally
npm install -g @kjanat/github-labelmanager
github-labelmanager owner/repo

# Dry run
github-labelmanager owner/repo --dry-run
```

Set the `GITHUB_TOKEN` environment variable before running:

```bash
export GITHUB_TOKEN=ghp_xxx
github-labelmanager owner/repo
```

## Library Usage

### ESM

```javascript
import {
  LabelManager,
  loadConfig,
  syncLabels,
} from "@kjanat/github-labelmanager";

const config = await loadConfig(".github/labels.yml");

const manager = new LabelManager({
  token: process.env.GITHUB_TOKEN,
  owner: "owner",
  repo: "repo",
  dryRun: false,
});

const result = await syncLabels(manager, config);
console.log(result.summary);
// => "Created: 2, Updated: 1, Renamed: 1, Deleted: 0, Unchanged: 5"
```

### CommonJS

```javascript
const {
  LabelManager,
  loadConfig,
  syncLabels,
} = require("@kjanat/github-labelmanager");

async function main() {
  const config = await loadConfig(".github/labels.yml");

  const manager = new LabelManager({
    token: process.env.GITHUB_TOKEN,
    owner: "owner",
    repo: "repo",
    dryRun: false,
  });

  const result = await syncLabels(manager, config);
  console.log(result.summary);
}

main();
```

## API

### `loadConfig(path: string): Promise<LabelConfig>`

Load and validate a YAML configuration file.

### `syncLabels(client: IGitHubClient, config: LabelConfig): Promise<SyncResult>`

Synchronize labels with the GitHub repository.

### `LabelManager`

High-level API for managing GitHub labels.

```javascript
const manager = new LabelManager({
  token: "ghp_xxx",
  owner: "owner",
  repo: "repo",
  dryRun: false,
});

// List all labels
const labels = await manager.listLabels();

// Create a label
await manager.createLabel({ name: "bug", color: "d73a4a", description: "Bug" });

// Update a label
await manager.updateLabel("bug", { color: "ff0000" });

// Delete a label
await manager.deleteLabel("obsolete");
```

## Configuration File

Create `.github/labels.yml`:

```yaml
labels:
  - name: bug
    color: "#d73a4a"
    description: Something isn't working

  - name: feature
    color: "#a2eeef"
    description: New feature or request
    aliases: [enhancement] # Renames 'enhancement' to 'feature'

delete:
  - obsolete-label
```

## Environment Variables

| Variable       | Required | Description                        |
| -------------- | -------- | ---------------------------------- |
| `GITHUB_TOKEN` | Yes      | GitHub personal access token       |
| `REPO`         | No       | Fallback if not passed as argument |
| `DRY_RUN`      | No       | Set to `true` for dry-run mode     |
| `CONFIG_PATH`  | No       | Path to config file                |

## GitHub Action

This package is also available as a GitHub Action:

```yaml
- uses: kjanat/github-labelmanager@v1
  with:
    token: ${{ github.token }}
```

## Links

- [GitHub Repository](https://github.com/kjanat/github-labelmanager)
- [JSR Package](https://jsr.io/@kjanat/github-labelmanager)
- [Documentation](https://github.com/kjanat/github-labelmanager#readme)

## License

MIT
