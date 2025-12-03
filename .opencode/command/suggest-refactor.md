---
description: Find lint ignore comments and suggest refactoring to remove them
model: anthropic/claude-opus-4-5
---

Search the codebase for lint suppression comments and analyze each one.

## Lint Ignore Comments Found

!`.opencode/command/suggest-refactor.sh $ARGUMENTS`

## Analysis Guidelines

For each ignore comment found:

1. **Context**: Read surrounding code (5-10 lines)
2. **Reason**: Identify why the ignore was added (check inline comment)
3. **Severity**: Rate removability (easy/medium/hard)
4. **Suggestion**: Provide concrete refactoring approach

## Common Refactoring Strategies

- `noExcessiveCognitiveComplexity` -> Extract helper functions, reduce nesting
- `noStaticOnlyClass` -> Convert to module with exported functions
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
