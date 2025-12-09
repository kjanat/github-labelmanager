---
description: "Git commit. Args: [push|no-push|no-verify|amend]..."
agent: build
---

Commit staged changes.

<consider>

arguments: $ARGUMENTS

</consider>

- If `no-push` or `nopush` is present OR flag reference is specified: do NOT
  push after commit
- If `push` is present: push after commit
- If `no-verify` is present: use `--no-verify` flag, otherwise do not use it
- If `amend` is present: use `--amend` flag, decide yourself whether to use
  `--no-edit`, or specify an updated message, otherwise do not use `--amend`.

IMPORTANT: NEVER use `--no-verify` or `--amend` unless explicitly provided in
arguments.

Make sure the commit message includes a prefix like

```plaintext
action:     # action.yml (GitHub Action definition)
build:      # deno.json, scripts/build_npm.ts
chore:      # general maintenance, .gitignore
ci:         # .github/workflows/*
docker:     # Dockerfile
docs:       # README.md, AGENTS.md, markdown
feat:       # new features in src/
fix:        # bug fixes
perf:       # performance improvements
refactor:   # code restructuring
revert:     # reverting changes
style:      # formatting (deno fmt)
test:       # test files (*_test.ts)
```

This is a Deno-based GitHub label management tool.

Prefer to explain WHY something was done from an end user perspective instead of
WHAT was done.

do not do generic messages like "improved agent experience" be very specific
about what user-facing changes were made

After the single commit that requested a push, do not push again, ever, without
explicit re-request to do so.

Here is the status:

<git_status>

!`git --no-pager status`

</git_status>

<git_diff_stat_staged>

!`git --no-pager diff --stat --staged`

</git_diff_stat_staged>

<!-- markdownlint-disable-file MD033 MD041 -->
