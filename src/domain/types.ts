/**
 * Types for github-labelmanager
 * @module
 */

// Re-export from schema source (single source of truth)
export type {
  LabelConfig,
  LabelConfigMeta,
  LabelDefinition,
} from "../schema.ts";

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
