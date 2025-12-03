/**
 * Types for github-labelmanager
 * @module
 */

/** Label definition from labels.yml config file */
export interface LabelDefinition {
  /** The name of the label */
  name: string;
  /** The color as 6 character hex code (with or without '#') */
  color: string;
  /** Description of the label */
  description: string;
  /** Optional aliases for renaming from old label names */
  aliases?: string[];
}

/** Root configuration schema from labels.yml */
export interface LabelConfig {
  /** Labels to create/update */
  labels: LabelDefinition[];
  /** Labels to delete (by name) */
  delete?: string[];
}

/** Options for GitHub label API operations */
export interface LabelOptions {
  /** The name of the label */
  name: string;
  /** The color of the label as 6 character hex code, without '#' */
  color?: string;
  /** The description of the label */
  description?: string;
  /** The new name of the label (for renames) */
  new_name?: string;
}

/** Label as returned by GitHub API */
export interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

/** Environment/CLI configuration */
export interface EnvConfig {
  token: string;
  owner: string;
  repo: string;
  dryRun: boolean;
  configPath?: string;
}

/** Individual sync operation result */
export interface SyncOperation {
  type: "create" | "update" | "rename" | "delete" | "skip";
  label: string;
  /** For renames: the old name */
  from?: string;
  success: boolean;
  error?: string;
}

/** Result of a sync operation - extensible for different output formats */
export interface SyncResult {
  success: boolean;
  operations: SyncOperation[];
  /** Summary counts */
  summary: {
    created: number;
    updated: number;
    renamed: number;
    deleted: number;
    skipped: number;
    failed: number;
  };
}
