# comment-pkg-pr

GitHub Action to post or update PR comments with pkg-pr-new publish information.

## Usage

```yaml
- name: Publish
  run: npx pkg-pr-new publish --json output.json --comment=off

- name: Post or update comment
  uses: ./.github/actions/comment-pkg-pr
  with:
    github-token: ${{ github.token }}
    output-file: output.json
```

## Inputs

| Input                | Description                       | Required | Default                 |
| -------------------- | --------------------------------- | -------- | ----------------------- |
| `github-token`       | GitHub token for API access       | Yes      | -                       |
| `output-file`        | Path to pkg-pr-new JSON output    | No       | `output.json`           |
| `comment-identifier` | Unique identifier for bot comment | No       | `## pkg-pr-new publish` |

## Outputs

| Output        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `comment-id`  | ID of created/updated comment (empty if no PR found) |
| `comment-url` | URL of the comment (empty if no PR found)            |
| `pr-found`    | Whether a PR was found (`"true"` or `"false"`)       |

## Permissions

Requires `pull-requests: write` permission.

```yaml
permissions:
  pull-requests: write
```

## Behavior

- **pull_request events**: Posts comment to the PR
- **push events**: Finds associated open PR for the branch, posts comment there
- **No PR found**: Logs publish info to console and step summary

Always writes a step summary with publish results.

## Development

```bash
bun install
bun run package
```
