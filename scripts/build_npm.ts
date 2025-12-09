#!/usr/bin/env -S deno run -A

import { build, emptyDir } from "@deno/dnt";

// Package information from deno.json
import pkg from "$/deno.json" with { type: "json" };

const mainPath: string = "main.ts";

await emptyDir("npm");

// Strip shebang from main.ts before build (TypeScript parser can't handle it)
const originalMain = await Deno.readTextFile(mainPath);
const hasShebang = originalMain.startsWith("#!");

if (hasShebang) {
  const stripped = originalMain.replace(/^#!.*\n/, "");
  await Deno.writeTextFile(mainPath, stripped);
}

const versionArg: string | undefined = Deno.args[0];
const versionPkg: string = pkg.version;
const version: string = versionArg ?? versionPkg;
const name: string = pkg.name;

// Detect jsr:@eemeli/yaml to swap for npm:yaml during build
const originalYamlImport: string | undefined = pkg.imports?.yaml;
const isJsrYaml = originalYamlImport?.startsWith("jsr:@eemeli/yaml");

console.info(`Package name:\t\t\t${name}`);
console.info(`Package version from deno.json:\t${versionPkg}`);

if (versionArg) {
  console.info(`Version passed as argument:\t${versionArg}`);

  versionArg != undefined
    ? versionPkg != versionArg
      ? console.error(
        `Version mismatch.\n\tjson:\t${versionPkg}\n\targ:\t${versionArg}`,
      )
      : console.info(`Version match: ${versionPkg} == ${versionArg}`)
    : null;

  console.info(`Resolved version:\t\t${version}`);
}

// Swap jsr:@eemeli/yaml -> npm:yaml for npm build
if (isJsrYaml) {
  if (!originalYamlImport) {
    throw new Error("Expected yaml import in deno.json imports but found none");
  }
  const denoJsonContent = await Deno.readTextFile("./deno.json");
  const denoConfig = JSON.parse(denoJsonContent) as Record<string, unknown>;
  if (!denoConfig.imports || typeof denoConfig.imports !== "object") {
    throw new Error("Expected imports object in deno.json");
  }
  const imports = denoConfig.imports as Record<string, string>;
  imports.yaml = "npm:yaml" + originalYamlImport.replace(/^jsr:@eemeli\/yaml/, "");
  await Deno.writeTextFile("./deno.json", JSON.stringify(denoConfig, null, 2) + "\n");
}

try {
  await build({
    entryPoints: [mainPath],
    outDir: "npm",
    importMap: "deno.json",
    esModule: true,
    typeCheck: "both",
    declaration: "inline",
    scriptModule: false, // default "cjs"
    packageManager: "bun",
    test: false,
    rootTestDir: "__tests__",
    shims: {
      // Shims Deno.* APIs for Node.js users
      deno: true,
    },
    package: {
      name: name,
      version: version,
      description: pkg.description,
      keywords: pkg.keywords,
      bugs: pkg.bugs,
      repository: pkg.repository,
      license: pkg.license,
      author: pkg.author,
      publish: pkg.publish,
      readme: pkg.readme,
      bin: pkg.bin,
      type: "module",
      scripts: pkg.tasks,
    },
    postBuild(): void {
      // Copy readme/license
      Deno.copyFileSync("README.md", "npm/README.md");
      Deno.copyFileSync("LICENSE", "npm/LICENSE");

      // Add Node.js shebang to bin entry for npx compatibility
      const binPath = "npm/esm/main.js";
      const binContent = Deno.readTextFileSync(binPath);
      Deno.writeTextFileSync(binPath, `#!/usr/bin/env node\n${binContent}`);
    },
    filterDiagnostic(diagnostic) {
      const fileName = diagnostic.file?.fileName;
      if (
        fileName?.includes(".github/") || fileName?.includes("node_modules/")
      ) {
        return false;
      }
      return true;
    },
  });
} finally {
  // Always restore original main.ts with shebang
  if (hasShebang) {
    Deno.writeTextFileSync(mainPath, originalMain);
  }
  // Restore original yaml import
  if (isJsrYaml && originalYamlImport) {
    const denoJsonContent = Deno.readTextFileSync("./deno.json");
    const denoConfig = JSON.parse(denoJsonContent) as Record<string, unknown>;
    if (denoConfig.imports && typeof denoConfig.imports === "object") {
      const imports = denoConfig.imports as Record<string, string>;
      imports.yaml = originalYamlImport;
      Deno.writeTextFileSync("./deno.json", JSON.stringify(denoConfig, null, 2) + "\n");
    }
  }
}
