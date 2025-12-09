/**
 * Domain layer - Core business types and logic
 * @module
 */

// From labels.ts - branded types and validation utilities
export type {
  Label,
  LabelColor,
  LabelConfig as LabelModelConfig,
  LabelDescription,
  LabelName,
  RawLabelConfig,
} from "./labels.ts";
export {
  label,
  LabelColorUtils,
  LabelDescriptionUtils,
  LabelNameUtils,
  parseLabelConfig,
} from "./labels.ts";

// From types.ts - schema types and sync types
export type {
  EnvConfig,
  LabelConfig,
  LabelConfigMeta,
  LabelDefinition,
  SyncOperation,
  SyncResult,
} from "./types.ts";
