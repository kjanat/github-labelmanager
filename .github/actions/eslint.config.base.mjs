// Shared ESLint configuration for GitHub Actions
// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import _import from "eslint-plugin-import";
import globals from "globals";

/**
 * Create ESLint flat config for GitHub Actions
 * @param {Object} options - Configuration options
 * @param {string} options.baseDirectory - The action's directory (import.meta.dirname)
 * @param {string[]} [options.allowDefaultProject] - Files to allow without tsconfig
 * @param {number} [options.ecmaVersion] - ECMAScript version (default: 2024)
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig({
  baseDirectory,
  allowDefaultProject = ["__tests__/*.ts", "*.config.ts", "*.config.mjs"],
  ecmaVersion = 2024,
}) {
  const compat = new FlatCompat({
    baseDirectory,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
  });

  return [
    { ignores: ["**/coverage", "**/dist", "**/linter", "**/node_modules"] },
    ...compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
    ),
    {
      plugins: {
        import: fixupPluginRules(_import),
        "@typescript-eslint": typescriptEslint,
      },

      languageOptions: {
        globals: {
          ...globals.node,
          Atomics: "readonly",
          SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion,
        sourceType: "module",

        parserOptions: {
          projectService: { allowDefaultProject },
          tsconfigRootDir: baseDirectory,
        },
      },

      settings: {
        "import/resolver": {
          typescript: { alwaysTryTypes: true, project: "tsconfig.json" },
        },
      },

      rules: {
        camelcase: "off",
        "import/no-namespace": "off",
        "no-console": "off",
        // Disable base rules in favor of TypeScript-aware versions
        "no-shadow": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true,
          },
        ],
      },
    },
  ];
}
