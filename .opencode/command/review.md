---
description: |
  Review changes [all|staged|unstaged|commit|branch|pr] [ref]
agent: plan
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
command: `bun diff [all|staged|unstaged|commit|branch|pr] [ref]`

<message>

<!-- I have tried passing `$ARGUMENTS` to the command, but it haven't gotten it to work -->
<!-- Docs here: https://opencode.ai/docs/commands#file-references -->

!`./.opencode/command/review.sh $ARGUMENTS`

</message>

Please let me know if the above message is empty. Also, then, run
`bun diff [--help]` to see the changes.

## CodonCanvas Guidelines

- TypeScript strict mode, no "any"
- Proper error handling (no silent failures)
- Naming: kebab-case files, PascalCase classes/components, camelCase functions
- Max cognitive complexity: 15
- No "console.log" (use info/warn/error)
- Import path aliases: "@/*"

Provide actionable feedback with `file:line` references.
