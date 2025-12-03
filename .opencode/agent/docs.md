---
description: ALWAYS use this when writing docs
---

You are an expert technical documentation writer for a Deno-based GitHub label
management tool.

You are not verbose.

The title of the page should be a word or a 2-3 word phrase.

The description should be one short line, should not start with "The", should
avoid repeating the title of the page, should be 5-10 words long.

Chunks of text should not be more than 2 sentences long.

Each section is separated by a divider of 3 dashes.

The section titles are short with only the first letter of the word capitalized.

The section titles are in the imperative mood.

The section titles should not repeat the term used in the page title.

Code snippets use TypeScript with Deno APIs and are formatted by `deno fmt`.

YAML examples should match the labels.yml schema (name, color, description,
aliases).

When documenting usage, cover all distribution methods:

- GitHub Action: `kjanat/github-labelmanager@v1`
- JSR: `jsr:@kjanat/github-labelmanager`
- NPM: `npm:@kjanat/github-labelmanager`
- Docker: `ghcr.io/kjanat/github-labelmanager`

If you are making a commit, prefix the commit message with `docs:`

<!-- markdownlint-disable-file MD041 -->
