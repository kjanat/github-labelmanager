/**
 * Configuration loading and validation
 * @module
 */

import { isMap, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';
import { fromError } from 'zod-validation-error';
import type { LabelConfig } from './domain/types.ts';
import { labelConfig } from './schema.ts';

/** Default config file path */
export const DEFAULT_CONFIG_PATH = '.github/labels.yml';

/**
 * Custom error for configuration issues
 */
export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigError';
	}
}

/**
 * Type guard to validate LabelConfig schema using Zod
 */
export function isLabelConfig(obj: unknown): obj is LabelConfig {
	return labelConfig.safeParse(obj).success;
}

/**
 * Load and validate labels config from YAML file
 * @param path - Path to config file (optional, uses CONFIG_PATH env or default)
 * @throws {Deno.errors.NotFound} If config file not found
 * @throws {Error} If config file is invalid
 */
export async function loadConfig(path?: string): Promise<LabelConfig> {
	const configPath = path ?? Deno.env.get('CONFIG_PATH') ?? DEFAULT_CONFIG_PATH;

	let configContent: string;
	try {
		configContent = await Deno.readTextFile(configPath);
	} catch (err) {
		if (err instanceof Deno.errors.NotFound) {
			throw new Deno.errors.NotFound(`Config file not found: ${configPath}`);
		}
		throw new Error(`Failed to read config file: ${configPath}: ${err}`);
	}

	// Parse with line tracking for annotations
	const lineCounter = new LineCounter();
	const doc = parseDocument(configContent, { lineCounter });

	// Check for parse errors
	if (doc.errors.length > 0) {
		throw new Deno.errors.InvalidData(`YAML parse error: ${doc.errors[0].message}`);
	}

	// Validate with Zod (safeParse accepts unknown, no need to pre-cast toJS()'s `any`)
	const validation = labelConfig.safeParse(doc.toJS());

	if (!validation.success) {
		const validationError = fromError(validation.error);
		throw new Deno.errors.InvalidData(`Invalid labels.yml schema:\n${validationError.toString()}`);
	}

	// Build line number maps for annotations
	const labelLines: Record<string, number> = {};
	const ignoreLines: Record<string, number> = {};
	const deleteLines: Record<string, number> = {};

	// Extract line numbers for labels
	const labelsNode = doc.get('labels', true);
	if (isSeq(labelsNode)) {
		for (const item of labelsNode.items) {
			if (isMap(item)) {
				const nameNode = item.get('name', true);
				if (isScalar(nameNode) && nameNode.range) {
					const value = nameNode.value;
					if (value == null) continue;
					const name = typeof value === 'string' ? value : String(value);
					labelLines[name] = lineCounter.linePos(nameNode.range[0]).line;
				}
			}
		}
	}

	// Extract line numbers for ignore entries
	const ignoreNode = doc.get('ignore', true);
	if (isSeq(ignoreNode)) {
		for (const item of ignoreNode.items) {
			if (isScalar(item) && item.range) {
				const value = item.value;
				if (value == null) continue;
				const pattern = typeof value === 'string' ? value : String(value);
				ignoreLines[pattern] = lineCounter.linePos(item.range[0]).line;
			}
		}
	}

	// Extract line numbers for delete entries (deprecated, but still tracked)
	const deleteNode = doc.get('delete', true);
	if (isSeq(deleteNode)) {
		for (const item of deleteNode.items) {
			if (isScalar(item) && item.range) {
				const value = item.value;
				if (value == null) continue;
				const name = typeof value === 'string' ? value : String(value);
				deleteLines[name] = lineCounter.linePos(item.range[0]).line;
			}
		}
	}

	// Attach metadata via spread to avoid mutating validation.data
	const config: LabelConfig = {
		...validation.data,
		_meta: { filePath: configPath, labelLines, ignoreLines, deleteLines },
	};
	return config;
}
