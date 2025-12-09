# @kjanat/github-labelmanager

Declaratively sync GitHub issue labels from a YAML config file.

## Installation

```bash
deno add jsr:@kjanat/github-labelmanager
```

## CLI Usage

```bash
# Install globally
deno install -Agn github-labelmanager jsr:@kjanat/github-labelmanager/cli

# Run directly
deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo

# Dry run
deno run -A jsr:@kjanat/github-labelmanager/cli owner/repo --dry-run
```

## Library Usage

```typescript
import {
  LabelManager,
  loadConfig,
  syncLabels,
} from "@kjanat/github-labelmanager";

// Load configuration
const config = await loadConfig(".github/labels.yml");

// Create manager
const manager = new LabelManager({
  token: Deno.env.get("GITHUB_TOKEN")!,
  owner: "owner",
  repo: "repo",
  dryRun: false,
});

// Sync labels
const result = await syncLabels(manager, config);
console.log(result.summary);
// => "Created: 2, Updated: 1, Renamed: 1, Deleted: 0, Unchanged: 5"
```

## API

### Core Functions

#### `loadConfig(path: string): Promise<LabelConfig>`

Load and validate a YAML configuration file.

```typescript
const config = await loadConfig(".github/labels.yml");
```

#### `syncLabels(client: IGitHubClient, config: LabelConfig): Promise<SyncResult>`

Synchronize labels with the GitHub repository.

```typescript
const result = await syncLabels(manager, config);
```

### Classes

#### `LabelManager`

High-level API for managing GitHub labels with dependency injection.

```typescript
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

### Types

```typescript
interface LabelConfig {
  labels: LabelDefinition[];
  delete?: string[];
}

interface LabelDefinition {
  name: string;
  color: string;
  description: string;
  aliases?: string[];
}

interface SyncResult {
  created: string[];
  updated: string[];
  renamed: Array<{ from: string; to: string }>;
  deleted: string[];
  unchanged: string[];
  errors: Array<{ label: string; error: string }>;
  summary: string;
}
```

## Testing

The package exports testing utilities:

```typescript
import {
  createTestEnv,
  MockGitHubClient,
  NullLogger,
} from "@kjanat/github-labelmanager";

// Mock client for testing
const mockClient = new MockGitHubClient();
mockClient.labels = [{ name: "bug", color: "d73a4a", description: "Bug" }];

// Silent logger
const logger = new NullLogger();

// Test environment setup
const cleanup = createTestEnv({
  GITHUB_TOKEN: "test-token",
  REPO: "owner/repo",
});
// ... run tests ...
cleanup();
```

## Configuration File

```yaml
# .github/labels.yml
labels:
  - name: bug
    color: "#d73a4a"
    description: Something isn't working

  - name: feature
    color: "#a2eeef"
    description: New feature or request
    aliases: [enhancement]

delete:
  - obsolete-label
```

## Links

- [GitHub Repository](https://github.com/kjanat/github-labelmanager)
- [NPM Package](https://www.npmjs.com/package/@kjanat/github-labelmanager)
- [GitHub Action](https://github.com/kjanat/github-labelmanager#github-action)

## License

MIT
