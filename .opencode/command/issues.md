---
description: Find issue(s) on github
model: anthropic/claude-haiku-4-5
---

Search through existing issues in this repo (see below for repo info) using the
`gh` cli to find issues matching this query:

<query>

$ARGUMENTS

</query>

**Consider:**

1. Similar titles or descriptions
2. Same error messages or symptoms
3. Related functionality or components
4. Similar feature requests

**Please list any matching issues with:**

- Issue number and title
- Brief explanation of why it matches the query
- Link to the issue

If no clear matches are found, say so.

**This is the repository information:**

<repo_info>

!`gh repo view --json name,nameWithOwner,owner --jq '.'`

</repo_info>

**Here is the help for the `gh issue list` command:**

<gh_issue_list_help>

!`gh issue list --help`

</gh_issue_list_help>

<!-- markdownlint-disable-file MD033 MD041 -->
