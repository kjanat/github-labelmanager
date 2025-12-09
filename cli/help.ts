/**
 * CLI help message
 * @module
 */

/**
 * Print help message
 */
export function printHelp(): void {
  console.log(`
Usage: github-labelmanager [OWNER/REPO] [OPTIONS]

Options:
  --dry-run           Run without making changes to GitHub
  --config <path>     Path to labels.yml config file
  --config=<path>     Path to labels.yml config file (alternate syntax)
  --help, -h          Show this help message

Environment Variables:
  GITHUB_TOKEN        Required. GitHub Personal Access Token
  REPO                Optional. Repository in 'owner/repo' format
  CONFIG_PATH         Optional. Path to config file (default: .github/labels.yml)
  DRY_RUN             Optional. Set to 'true' for dry run mode
`);
}
