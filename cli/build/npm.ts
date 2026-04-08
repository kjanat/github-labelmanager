#!/usr/bin/env -S deno run -A

import { build, emptyDir } from '@deno/dnt';

// Package information from deno.json
import pkg from '$/deno.json' with { type: 'json' };

const mainPath = import.meta.resolve('github-labelmanager');

await emptyDir('npm');

// Strip shebang from main.ts before build (TypeScript parser can't handle it)
const originalMain = await Deno.readTextFile(mainPath);
const hasShebang = originalMain.startsWith('#!');

if (hasShebang) {
	const stripped = originalMain.replace(/^#!.*\n/, '');
	await Deno.writeTextFile(mainPath, stripped);
}

const versionArg: string | undefined = Deno.args[0];
const versionPkg: string = pkg.version;
const version: string = versionArg ?? versionPkg;
const name: string = pkg.name;

// Detect JSR imports to swap for npm equivalents during build
const originalYamlImport: string | undefined = pkg.imports?.yaml;
const isJsrYaml = originalYamlImport?.startsWith('jsr:@eemeli/yaml');

const originalDreamcliImport: string | undefined = pkg.imports?.['@kjanat/dreamcli'];
const isJsrDreamcli = originalDreamcliImport?.startsWith('jsr:');

console.info(`Package name:\t\t\t${name}`);
console.info(`Package version from deno.json:\t${versionPkg}`);

if (versionArg) {
	console.info(`Version passed as argument:\t${versionArg}`);

	if (versionArg !== undefined && versionPkg !== versionArg) {
		console.error(
			`Version mismatch.\n\tjson:\t${versionPkg}\n\targ:\t${versionArg}`,
		);
	} else {
		console.info(`Version match: ${versionPkg} == ${versionArg}`);
	}

	console.info(`Resolved version:\t\t${version}`);
}

// Save original deno.json verbatim for restoration
const originalDenoJson = await Deno.readTextFile('./deno.json');

// Swap JSR imports -> npm equivalents for build
let patchedDenoJson = originalDenoJson;
if (isJsrYaml && originalYamlImport) {
	patchedDenoJson = patchedDenoJson.replace(
		originalYamlImport,
		`npm:yaml${originalYamlImport.replace(/^jsr:@eemeli\/yaml/, '')}`,
	);
}
if (isJsrDreamcli && originalDreamcliImport) {
	patchedDenoJson = patchedDenoJson.replace(
		originalDreamcliImport,
		originalDreamcliImport.replace(/^jsr:/, 'npm:'),
	);
}
await Deno.writeTextFile('./deno.json', patchedDenoJson);

try {
	await build({
		entryPoints: [mainPath],
		outDir: 'npm',
		importMap: 'deno.json',
		esModule: true,
		typeCheck: 'both',
		declaration: 'inline',
		scriptModule: false, // default "cjs"
		packageManager: 'bun@1.3.11',
		test: false,
		rootTestDir: '__tests__',
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
			bin: pkg.bin,
			type: 'module',
			scripts: Object.fromEntries(
				Object.entries(pkg.tasks).map(([k, v]) => [k, typeof v === 'string' ? v : v.command]),
			),
		},
		postBuild(): void {
			// Copy readme/license
			Deno.copyFileSync('NPM_README.md', 'npm/README.md');
			Deno.copyFileSync('LICENSE', 'npm/LICENSE');

			// Add Node.js shebang to bin entry for npx compatibility
			const binPath = 'npm/esm/cli/main.js';
			const binContent = Deno.readTextFileSync(binPath);
			Deno.writeTextFileSync(binPath, `#!/usr/bin/env node\n${binContent}`);
		},
		filterDiagnostic(diagnostic) {
			const fileName = diagnostic.file?.fileName;
			if (
				fileName?.includes('.github/') || fileName?.includes('node_modules/')
			) {
				return false;
			}
			return true;
		},
	});
} finally {
	// Always restore original files verbatim
	if (hasShebang) {
		Deno.writeTextFileSync(mainPath, originalMain);
	}
	Deno.writeTextFileSync('./deno.json', originalDenoJson);
}
