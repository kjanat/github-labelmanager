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
  const denoJsonContent = await Deno.readTextFile("./deno.json");
  await Deno.writeTextFile(
    "./deno.json",
    denoJsonContent.replace(
      originalYamlImport!,
      "npm:yaml" + originalYamlImport!.replace(/^jsr:@eemeli\/yaml/, ""),
    ),
  );
}

try {
  await build({
    entryPoints: [mainPath],
    outDir: "npm",
    importMap: "deno.json",
    esModule: true,
    typeCheck: "both",
    test: false,
    declaration: "inline",
    scriptModule: false, // default "cjs"
    packageManager: "bun",
    rootTestDir: "src",
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
      repository: "github:kjanat/github-labelmanager", // pkg.repository,
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
    Deno.writeTextFileSync(
      "./deno.json",
      denoJsonContent.replace(
        "npm:yaml" + originalYamlImport.replace(/^jsr:@eemeli\/yaml/, ""),
        originalYamlImport,
      ),
    );
  }
}
