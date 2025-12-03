import { build, emptyDir, type EntryPoint } from "@deno/dnt";

// Package information from deno.json
import pkg from "~/deno.json" with { type: "json" };

const mainPath: string = "./main.ts";
const entryPoint: (string | EntryPoint)[] = [mainPath];
const outDir: string = "./npm";

await emptyDir(outDir);

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

await build({
  entryPoints: entryPoint,
  outDir: outDir,
  esModule: true,
  typeCheck: "both",
  test: false,
  declaration: "inline",
  scriptModule: "cjs",
  shims: {
    // Shims Deno.* APIs for Node.js users
    deno: true,
  },
  package: {
    // Standard package.json fields
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
    bin: {
      "github-labelmanager": "./esm/main.js",
    },
  },
  postBuild(): void {
    // Copy readme/license
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("LICENSE", "npm/LICENSE");

    // Add Node.js shebang to bin entry for npx compatibility
    const binPath = "npm/esm/main.js";
    const binContent = Deno.readTextFileSync(binPath);
    Deno.writeTextFileSync(binPath, `#!/usr/bin/env node\n${binContent}`);

    // Restore original main.ts with shebang
    if (hasShebang) {
      Deno.writeTextFileSync(mainPath, originalMain);
    }
  },
});
