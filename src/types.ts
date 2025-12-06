/**
 * Types for github-labelmanager
 * @module
 */

/** Label definition from labels.yml config file */
export interface LabelDefinition {
  /** The name of the label */
  name: string;
  /**
   * The color as 6 character hex code (with or without '#')
   * @pattern ^#?[0-9A-Fa-f]{6}$
   */
  color: string;
  /** Description of the label */
  description: string;
  /** Optional aliases for renaming from old label names */
  aliases?: string[];
}

/** Metadata for config annotations (not part of YAML schema) */
export interface LabelConfigMeta {
  /** Resolved config file path */
  filePath: string;
  /** Map of label name -> 1-based line number */
  labelLines: Record<string, number>;
  /** Map of delete entry -> 1-based line number */
  deleteLines: Record<string, number>;
}

/** Root configuration schema from labels.yml */
export interface LabelConfig {
  /** Labels to create/update */
  labels: LabelDefinition[];
  /** Labels to delete (by name) */
  delete?: string[];
  /** Metadata for annotations (populated during parsing, not serialized) */
  _meta?: LabelConfigMeta;
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
  /** Details for summary display */
  details?: {
    color?: string;
    description?: string;
    /** For updates: previous values */
    oldColor?: string;
    oldDescription?: string;
  };
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
