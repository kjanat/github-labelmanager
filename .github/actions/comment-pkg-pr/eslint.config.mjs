// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { createConfig } from "../eslint.config.base.mjs";

export default createConfig({
  baseDirectory: import.meta.dirname,
  allowDefaultProject: [
    "__tests__/*.ts",
    "__fixtures__/*.ts",
    "*.config.ts",
    "*.config.mjs",
  ],
});
