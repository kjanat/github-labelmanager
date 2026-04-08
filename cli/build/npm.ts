#!/usr/bin/env -S deno run -A

import { build, emptyDir } from '@deno/dnt';
import { fromFileUrl } from '@std/path';

type DenoJson = {
	name: string;
	version: string;
	description?: string;
	keywords?: string[];
	bugs?: string | { url: string; email?: string };
	repository?: string | { type: string; url: string; directory?: string };
	license?: string;
	author?: string | { name: string; email?: string; url?: string };
	bin?: string | Record<string, string>;
	imports?: Record<string, string>;
};

const mainPath = fromFileUrl(import.meta.resolve('github-labelmanager'));
const denoJsonPath = fromFileUrl(import.meta.resolve('$/deno.json'));
const outDir = 'npm';

// Read deno.json once as text + parsed JSON
const originalDenoJsonText = await Deno.readTextFile(denoJsonPath);
const pkg = JSON.parse(originalDenoJsonText) as DenoJson;

const versionArg = Deno.args[0];
const versionPkg = pkg.version;
const version = versionArg ?? versionPkg;
const name = pkg.name;

if (!name) throw new Error('Missing "name" in deno.json');
if (!versionPkg) throw new Error('Missing "version" in deno.json');

console.info(`Package name:\t\t\t${name}`);
console.info(`Package version from deno.json:\t${versionPkg}`);

if (versionArg) {
	console.info(`Version passed as argument:\t${versionArg}`);

	if (versionPkg !== versionArg) {
		throw new Error(`Version mismatch.\n\tjson:\t${versionPkg}\n\targ:\t${versionArg}`);
	}

	console.info(`Version match:\t\t\t${versionPkg} == ${versionArg}`);
}

console.info(`Resolved version:\t\t${version}`);

// Patch deno.json structurally, not with string replacement
const patchedPkg: DenoJson = structuredClone(pkg);

const { imports } = patchedPkg;
if (imports) {
	if (imports.yaml?.startsWith('jsr:@eemeli/yaml')) {
		imports.yaml = imports.yaml.replace(/^jsr:@eemeli\/yaml/, 'npm:yaml');
	}

	if (imports['@kjanat/dreamcli']?.startsWith('jsr:')) {
		imports['@kjanat/dreamcli'] = imports['@kjanat/dreamcli'].replace(/^jsr:/, 'npm:');
	}
}

let originalMain = '';
let hasShebang = false;

try {
	await emptyDir(outDir);

	// Strip shebang from main.ts before build
	originalMain = await Deno.readTextFile(mainPath);
	hasShebang = originalMain.startsWith('#!');

	if (hasShebang) {
		const stripped = originalMain.replace(/^#!.*\r?\n/, '');
		await Deno.writeTextFile(mainPath, stripped);
	}

	await Deno.writeTextFile(denoJsonPath, `${JSON.stringify(patchedPkg, null, 2)}\n`);

	await build({
		entryPoints: [mainPath],
		outDir,
		importMap: denoJsonPath,
		esModule: true,
		typeCheck: 'both',
		declaration: 'inline',
		scriptModule: false,
		packageManager: 'bun',
		test: false,
		rootTestDir: '__tests__',
		shims: {
			deno: true,
		},
		package: {
			name,
			version,
			description: pkg.description,
			keywords: pkg.keywords,
			bugs: pkg.bugs,
			repository: pkg.repository,
			license: pkg.license,
			author: pkg.author,
			bin: typeof pkg.bin === 'string' || pkg.bin ? pkg.bin : { [name]: './esm/cli/main.js' },
			type: 'module',
		},
		postBuild() {
			Deno.copyFileSync('NPM_README.md', `${outDir}/README.md`);
			Deno.copyFileSync('LICENSE', `${outDir}/LICENSE`);

			const binPath = `${outDir}/esm/cli/main.js`;
			const binContent = Deno.readTextFileSync(binPath);

			if (!binContent.startsWith('#!/usr/bin/env node\n')) {
				Deno.writeTextFileSync(binPath, `#!/usr/bin/env node\n${binContent}`);
			}
		},
		filterDiagnostic(diagnostic) {
			const fileName = diagnostic.file?.fileName;
			if (
				fileName?.includes('.github/')
				|| fileName?.includes('.github\\')
				|| fileName?.includes('node_modules/')
				|| fileName?.includes('node_modules\\')
			) {
				return false;
			}
			return true;
		},
	});
} finally {
	if (hasShebang) {
		Deno.writeTextFileSync(mainPath, originalMain);
	}
	Deno.writeTextFileSync(denoJsonPath, originalDenoJsonText);
}
