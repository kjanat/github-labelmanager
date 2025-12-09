/**
 * Logger adapters for different environments
 * @module
 */

// Types (re-exported from ports for convenience)
export type { AnnotationProperties, ILogger } from "~/ports/logger.ts";

// Implementations
export { ActionsLogger } from "./actions.ts";
export { ConsoleLogger } from "./console.ts";
