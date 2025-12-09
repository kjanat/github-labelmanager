---
description: Review changes [all|staged|unstaged|commit|branch|pr] [ref]
agent: plan
model: anthropic/claude-opus-4-5
---

Review the following code changes for:

1. Code quality and best practices
2. Potential bugs or edge cases
3. Performance considerations
4. Test coverage implications
5. Security concerns

## Changes

Get changes like this, use the following optional
<arguments>$ARGUMENTS</arguments> (if provided) to filter when running this
command:

```bash
./.opencode/command/review.sh [all|staged|unstaged|commit|branch|pr] [ref]
```

<message>

!`./.opencode/command/review.sh $ARGUMENTS`

</message>

Please let me know if the above message is empty. Also, then, run
`./.opencode/command/review.sh --help` to see usage.

## github-labelmanager Guidelines

- Deno runtime (not Node.js) - use Deno APIs
- Imports: JSR (`jsr:@std/*`) for stdlib, npm specifiers for npm packages
- Types: `interface` for shapes, `as const` for readonly objects
- Naming: camelCase (vars/funcs), PascalCase (types/classes), kebab-case (files)
- Error handling: try/catch with type guards, no silent failures
- Permissions: explicit flags (`--allow-net`, `--allow-read`, `--allow-env`)
- No "console.log" in `src/` (use logger from `./src/logger.ts`)

Provide actionable feedback with `file:line` references.

<!-- markdownlint-disable-file MD033 MD041 -->
