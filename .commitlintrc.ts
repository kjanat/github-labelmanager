import type { UserConfig } from "@commitlint/types";

const config: Readonly<UserConfig> = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "action", // action.yml (GitHub Action definition)
        "build", // deno.json, scripts/build_npm.ts
        "chore", // general maintenance, .gitignore
        "ci", // .github/workflows/*
        "docker", // Dockerfile
        "docs", // README.md, AGENTS.md, markdown
        "feat", // new features in src/
        "fix", // bug fixes
        "perf", // performance improvements
        "refactor", // code restructuring
        "revert", // reverting changes
        "style", // formatting (deno fmt)
        "test", // test files (*_test.ts)
      ],
    ],
  },
} as const;

export default config;
