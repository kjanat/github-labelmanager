import type { OutputMetadata } from "./types.ts";

/**
 * Format packages list for the comment body
 */
export function formatPackages(packages: OutputMetadata["packages"]): string {
  if (packages.length === 0) return "_No packages published_";
  return packages.map((pkg) => `- \`${pkg.name}\`: ${pkg.url}`).join("\n");
}

/**
 * Format templates list for the comment body
 */
export function formatTemplates(
  templates: OutputMetadata["templates"],
): string {
  if (templates.length === 0) return "_No templates available_";
  return templates.map((tmpl) => `- [${tmpl.name}](${tmpl.url})`).join("\n");
}

/**
 * Build the full comment body
 */
export function buildCommentBody(
  output: OutputMetadata,
  commitUrl: string,
  identifier: string,
): string {
  const packages = formatPackages(output.packages);
  const templates = formatTemplates(output.templates);

  return `${identifier}

### Published Packages

${packages}

### Templates

${templates}

[View Commit](${commitUrl})`;
}

/**
 * Build the step summary content (same as comment but with header)
 */
export function buildStepSummary(
  output: OutputMetadata,
  commitUrl: string,
  prFound: boolean,
): string {
  const packages = formatPackages(output.packages);
  const templates = formatTemplates(output.templates);
  const prStatus = prFound
    ? ":white_check_mark: Comment posted to PR"
    : ":information_source: No PR found, logged to console only";

  return `# pkg-pr-new Publish Results

${prStatus}

## Published Packages

${packages}

## Templates

${templates}

[View Commit](${commitUrl})`;
}

/**
 * Format log output for console
 */
export function formatLogOutput(
  output: OutputMetadata,
  commitUrl: string,
): string {
  const separator = "=".repeat(50);
  const packages = output.packages
    .map((pkg) => `  - ${pkg.name}: ${pkg.url}`)
    .join("\n");
  const templates = output.templates
    .map((tmpl) => `  - ${tmpl.name}: ${tmpl.url}`)
    .join("\n");

  return `
${separator}
Publish Information
${separator}

Published Packages:
${packages || "  (none)"}

Templates:
${templates || "  (none)"}

Commit URL: ${commitUrl}
${separator}`;
}
