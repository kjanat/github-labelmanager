// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { createConfig } from "../eslint.config.base.mjs";

export default createConfig({
  baseDirectory: import.meta.dirname,
  allowDefaultProject: [
    "__tests__/*.ts",
    "eslint.config.mjs",
    "rollup.config.ts",
  ],
});
