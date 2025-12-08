# check-schema-outdated

Verifies generated schema files are committed and up-to-date.

---

## How it works

1. Runs `deno task schema` to regenerate the schema
2. Compares the generated file against the committed version using `git diff`
3. Fails if differences are detected, with a summary showing the diff

---

## Usage

```yaml
- uses: kjanat/github-labelmanager/.github/actions/check-schema-outdated@master
  with:
    file: .github/labels.schema.json
```

or

```yaml
- uses: ./.github/actions/check-schema-outdated
  with:
    file: .github/labels.schema.json
```

---

## Inputs

| Name   | Required | Default                      | Description      |
| ------ | -------- | ---------------------------- | ---------------- |
| `file` | Yes      | `.github/labels.schema.json` | Schema file path |

---

## Outputs

| Name          | Description                       |
| ------------- | --------------------------------- |
| `file`        | Checked file path                 |
| `outdated`    | `true` if schema differs          |
| `up-to-date`  | `true` if schema matches          |
| `commit-hash` | Current commit hash               |
| `git-diff`    | Diff output (empty if up-to-date) |

---

## Requirements

- `deno` in PATH with a `schema` task defined in `deno.json`
- `git` checkout with the schema file tracked

---

## Development

```bash
bun install
bun run test
bun run bundle
```

---

## License

[MIT](./LICENSE)
