---
description: Find lint ignore comments and suggest refactoring to remove them
model: anthropic/claude-opus-4-5
---

<!-- markdownlint-disable-file MD033 MD041 -->

Search the codebase for lint suppression comments and analyze each one.

## Lint Ignore Comments Found

<ignore_comments>

!`bash -c "cd $(git rev-parse --show-toplevel) && ./.opencode/command/suggest-refactor.sh $ARGUMENTS"`

</ignore_comments>

## Analysis Guidelines

For each ignore comment found:

1. **Context**: Read surrounding code (5-10 lines)
2. **Reason**: Identify why the ignore was added (check inline comment)
3. **Severity**: Rate removability (easy/medium/hard)
4. **Suggestion**: Provide concrete refactoring approach

## Common Refactoring Strategies

- `deno-lint-ignore` -> Fix the underlying lint issue or document why it's
  necessary
- `deno-fmt-ignore` -> Restructure code to work with formatter
- `noExplicitAny` -> Add proper types or generics
- `@ts-expect-error` in tests -> Use type assertions or proper test utilities
- Generated files (`*.gen.ts`) -> Skip, auto-generated

## Output Format

For each finding provide:

- `file:line` reference
- Current ignore reason
- Suggested fix with code example
- Estimated effort (easy/medium/hard)

Focus on actionable suggestions. If an ignore is justified (e.g., testing
invalid inputs), acknowledge it but still suggest alternatives if possible.
