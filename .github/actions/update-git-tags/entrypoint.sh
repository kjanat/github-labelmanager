#!/usr/bin/env bash

# Source: https://github.com/actions/typescript-action/blob/eda541612e5f5293a585e778a04fec6a219ab4e4/script/release

# Exit early
# See: https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#The-Set-Builtin
set -euo pipefail

# About:
#
# This is a helper script to tag and push a new release. GitHub Actions use
# release tags to allow users to select a specific version of the action to use.
#
# See: https://github.com/actions/typescript-action#publishing-a-new-release
# See: https://github.com/actions/toolkit/blob/master/docs/action-versioning.md#recommendations
#
# This script will do the following:
#
# 1. Retrieve the latest release tag
# 2. Display the latest release tag
# 3. Prompt the user for a new release tag (CLI mode) or use INPUT_TAG (CI mode)
# 4. Validate the new release tag
# 5. Validate version file (package.json, deno.json, deno.jsonc, jsr.json, jsr.jsonc) if present
# 6. Tag a new release
# 7. Set 'is_major_release' variable
# 8. Point separate major release tag (e.g. v1, v2) to the new release
# 9. Point separate minor release tag (e.g. v1.2) to the new release (if enabled)
# 10. Push the new tags (with commits, if any) to remote
# 11. If this is a major release, create a 'releases/v#' branch and push (if enabled)
#
# Modes:
#
# - CI mode: Uses INPUT_* env vars from action.yml (when GITHUB_ACTIONS=true)
# - CLI mode: Interactive prompts when GITHUB_ACTIONS is unset
#
# Usage:
#
# CLI: ./entrypoint.sh
# CI:  Runs automatically via action.yml

# === Mode Detection ===
CI_MODE="${GITHUB_ACTIONS:-false}"

# === Terminal Colors (disabled in CI) ===
if [[ "${CI_MODE}" == "true" ]]; then
  OFF='' BOLD_RED='' BOLD_GREEN='' BOLD_BLUE='' BOLD_PURPLE=''
else
  OFF='\033[0m'
  BOLD_RED='\033[1;31m'
  BOLD_GREEN='\033[1;32m'
  BOLD_BLUE='\033[1;34m'
  BOLD_PURPLE='\033[1;35m'
fi

# === Logging Helpers ===
log() { echo -e "$1"; }
error() {
  if [[ "${CI_MODE}" == "true" ]]; then
    echo "::error::$1"
  else
    echo -e "${BOLD_RED}Error: $1${OFF}"
  fi
  exit 1
}
warn() {
  if [[ "${CI_MODE}" == "true" ]]; then
    echo "::warning::$1"
  else
    echo -e "${BOLD_PURPLE}Warning: $1${OFF}"
  fi
}
notice() {
  if [[ "${CI_MODE}" == "true" ]]; then
    echo "::notice::$1"
  else
    echo -e "${BOLD_BLUE}Notice: $1${OFF}"
  fi
}
output() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "$1=$2" >>"${GITHUB_OUTPUT}"
  fi
}

# === Input Handling ===
get_input() {
  local name="$1" default="${2:-}"
  local var="INPUT_${name^^}"
  var="${var//-/_}" # convert hyphens to underscores
  echo "${!var:-${default}}"
}

# === Version File Detection ===
find_version_file() {
  local specified="$1"

  if [[ "${specified}" == "auto" || -z "${specified}" ]]; then
    # Priority: package.json > deno.json > deno.jsonc > jsr.json > jsr.jsonc
    for file in package.json deno.json deno.jsonc jsr.json jsr.jsonc; do
      if [[ -f "${file}" ]]; then
        echo "${file}"
        return 0
      fi
    done
    return 1 # No version file found
  elif [[ "${specified}" == "none" || "${specified}" == "skip" ]]; then
    return 1 # Explicitly skip
  else
    if [[ -f "${specified}" ]]; then
      echo "${specified}"
      return 0
    else
      error "Version file not found: ${specified}"
    fi
  fi
}

# === Version File Validation ===
validate_version_file() {
  local tag="$1" file="$2"

  local file_version
  if [[ "${file}" == *.jsonc ]]; then
    # JSONC files need proper parsing - use Deno's JSONC support
    # Pass file as argument to avoid injection via filename
    file_version=$(
      deno eval '
        import { parse } from "jsr:@std/jsonc";
        const data = parse(Deno.readTextFileSync(Deno.args[0]));
        console.log(data.version ?? "");
      ' -- "${file}" 2>/dev/null
    )
  elif [[ "${file}" == *.json ]]; then
    # Standard JSON - jq handles it directly
    file_version=$(jq -r '.version // empty' "${file}")
  else
    error "Unsupported version file format: ${file}"
  fi

  if [[ -z "${file_version}" ]]; then
    warn "No version field in ${file}, skipping validation"
    return 0
  fi

  local tag_version="${tag#v}"
  if [[ "${tag_version}" != "${file_version}" ]]; then
    error "Version mismatch: tag=${tag_version}, ${file}=${file_version}"
  fi

  log "Version validated: ${BOLD_GREEN}${tag_version}${OFF} matches ${file}"
}

# === Prerelease Detection ===
is_prerelease() {
  local tag="$1"
  # Prerelease if contains hyphen after version (e.g., v1.2.3-beta.1)
  [[ "${tag}" == *-* ]]
}

# === Help ===
print_help() {
  cat <<'EOF'
Update Git Tags - Tag and push releases with major/minor version tracking

USAGE:
  ./entrypoint.sh [OPTIONS]
  ./entrypoint.sh --help

OPTIONS:
  -h, --help              Show this help message
  -t, --tag TAG           Version tag to process (e.g., v1.2.3)
  -M, --major             Update major version tag (default: true)
  -m, --minor             Update minor version tag (default: false)
  -b, --create-branch     Create releases/vX branch for major releases
  -f, --version-file FILE Path to version file (auto|none|path)

ENVIRONMENT VARIABLES (CI mode):
  INPUT_TAG               Version tag (required in CI)
  INPUT_MAJOR             Update major tag (true/false)
  INPUT_MINOR             Update minor tag (true/false)
  INPUT_CREATE_BRANCH     Create release branch (true/false)
  INPUT_VERSION_FILE      Version file path (auto/none/path)

EXAMPLES:
  # Interactive mode
  ./entrypoint.sh

  # With arguments
  ./entrypoint.sh --tag v1.2.3 --minor

  # Skip version file validation
  ./entrypoint.sh --tag v1.0.0 --version-file none

  # CI mode (via GitHub Actions)
  INPUT_TAG=v1.2.3 INPUT_MINOR=true ./entrypoint.sh
EOF
  exit 0
}

# === Argument Parsing (CLI mode only) ===
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        print_help
        ;;
      -t|--tag)
        [[ -z "${2:-}" || "${2:-}" == -* ]] && error "Option $1 requires a value"
        export INPUT_TAG="$2"
        shift 2
        ;;
      -M|--major)
        export INPUT_MAJOR="true"
        shift
        ;;
      --no-major)
        export INPUT_MAJOR="false"
        shift
        ;;
      -m|--minor)
        export INPUT_MINOR="true"
        shift
        ;;
      -b|--create-branch)
        export INPUT_CREATE_BRANCH="true"
        shift
        ;;
      -f|--version-file)
        [[ -z "${2:-}" || "${2:-}" == -* ]] && error "Option $1 requires a value"
        export INPUT_VERSION_FILE="$2"
        shift 2
        ;;
      *)
        error "Unknown option: $1 (use --help for usage)"
        ;;
    esac
  done
}

# Parse CLI arguments if not in CI mode
if [[ "${CI_MODE}" != "true" ]]; then
  parse_args "$@"
fi

# === Main Logic ===

# Get inputs
TAG=$(get_input TAG)
MAJOR=$(get_input MAJOR true)
MINOR=$(get_input MINOR false)
CREATE_BRANCH=$(get_input CREATE_BRANCH false)
VERSION_FILE_INPUT=$(get_input VERSION_FILE auto)

# Variables for glob matching
SEMVER_TAG_REGEX='^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'
SEMVER_TAG_GLOB='v[0-9]*.[0-9]*.[0-9]*'

# Interactive fallback for TAG (CLI mode only)
if [[ -z "${TAG}" ]]; then
  if [[ "${CI_MODE}" == "true" ]]; then
    error "tag input is required"
  fi

  # Get latest tag for reference
  if latest_tag=$(git describe --abbrev=0 --match="${SEMVER_TAG_GLOB}" 2>/dev/null); then
    log "Latest release tag: ${BOLD_BLUE}${latest_tag}${OFF}"
  else
    log "No existing release tags found"
    latest_tag=""
  fi

  read -r -p 'Enter new release tag (vX.X.X format): ' TAG
fi

# Validate tag format
if [[ ! "${TAG}" =~ ${SEMVER_TAG_REGEX} ]]; then
  error "Invalid tag format: ${TAG} (must be vX.X.X or vX.X.X-prerelease)"
fi

log "Processing tag: ${BOLD_BLUE}${TAG}${OFF}"

# Check for prerelease
is_prerelease "${TAG}" && {
  notice "Prerelease ${TAG}: major/minor tags will not be updated"
  MAJOR="false"
  MINOR="false"
}

# Version file validation
version_file=""
if version_file=$(find_version_file "${VERSION_FILE_INPUT}"); then
  validate_version_file "${TAG}" "${version_file}"
elif [[ "${VERSION_FILE_INPUT}" != "none" && "${VERSION_FILE_INPUT}" != "skip" ]]; then
  warn "No version file found, skipping validation"
fi

# Interactive confirmation (CLI mode only)
if [[ "${CI_MODE}" != "true" ]]; then
  echo -e -n "Continue with tag ${BOLD_BLUE}${TAG}${OFF}? [Y/n] "
  read -r confirm
  if [[ "${confirm}" =~ ^[Nn] ]]; then
    log "Aborted"
    exit 0
  fi
fi

# Extract version components
# v1.2.3 -> MAJOR_TAG=v1, MINOR_TAG=v1.2
MAJOR_TAG="${TAG%%.*}"                          # v1
MINOR_TAG="${TAG%.*}"                           # v1.2
MINOR_TAG="${MINOR_TAG%-*}"                     # Strip prerelease suffix if present

# Determine if this is a major release (new major version)
FIRST_RELEASE="false"
if latest_tag=$(git describe --abbrev=0 --match="${SEMVER_TAG_GLOB}" 2>/dev/null); then
  LATEST_MAJOR="${latest_tag%%.*}"
  if [[ "${MAJOR_TAG}" != "${LATEST_MAJOR}" ]]; then
    IS_MAJOR_RELEASE="true"
  else
    IS_MAJOR_RELEASE="false"
  fi
else
  # First release is always a major release
  IS_MAJOR_RELEASE="true"
  FIRST_RELEASE="true"
fi

log "Major release: ${BOLD_BLUE}${IS_MAJOR_RELEASE}${OFF}"

# Notice for first release or new major version
if [[ "${FIRST_RELEASE}" == "true" ]]; then
  notice "First release: ${TAG}"
elif [[ "${IS_MAJOR_RELEASE}" == "true" ]]; then
  notice "New major version: ${LATEST_MAJOR} -> ${MAJOR_TAG}"
fi

# Check if tag already exists
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  warn "Tag ${TAG} already exists, skipping tag creation"
else
  # Create annotated tag
  git tag "${TAG}" --annotate --message "${TAG} Release"
  log "Created tag: ${BOLD_GREEN}${TAG}${OFF}"
fi

# Update major tag (e.g., v1)
if [[ "${MAJOR}" == "true" ]]; then
  git tag "${MAJOR_TAG}" --force --annotate --message "Sync ${MAJOR_TAG} with ${TAG}"
  log "Updated major tag: ${BOLD_GREEN}${MAJOR_TAG}${OFF} -> ${TAG}"
  output "major-tag" "${MAJOR_TAG}"
fi

# Update minor tag (e.g., v1.2)
if [[ "${MINOR}" == "true" ]]; then
  git tag "${MINOR_TAG}" --force --annotate --message "Sync ${MINOR_TAG} with ${TAG}"
  log "Updated minor tag: ${BOLD_GREEN}${MINOR_TAG}${OFF} -> ${TAG}"
  output "minor-tag" "${MINOR_TAG}"
fi

# Push tags
log "Pushing tags to origin..."
COMMIT_SHA=$(git rev-parse --short HEAD)
git push origin "${TAG}" --force-with-lease 2>/dev/null || git push origin "${TAG}"

# Force push required: major/minor tags (v1, v1.2) are moved to latest release
if [[ "${MAJOR}" == "true" ]]; then
  git push origin "${MAJOR_TAG}" --force
  notice "Major tag ${MAJOR_TAG} moved to ${COMMIT_SHA}"
fi

if [[ "${MINOR}" == "true" ]]; then
  git push origin "${MINOR_TAG}" --force
  notice "Minor tag ${MINOR_TAG} moved to ${COMMIT_SHA}"
fi

# Create release branch for major releases (optional)
if [[ "${CREATE_BRANCH}" == "true" && "${IS_MAJOR_RELEASE}" == "true" ]]; then
  BRANCH_NAME="releases/${MAJOR_TAG}"
  if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    warn "Branch ${BRANCH_NAME} already exists"
  else
    git branch "${BRANCH_NAME}" "${TAG}"
    git push --set-upstream origin "${BRANCH_NAME}"
    notice "Release branch ${BRANCH_NAME} created from ${TAG}"
  fi
fi

# Set outputs
output "is-major-release" "${IS_MAJOR_RELEASE}"

log "${BOLD_GREEN}Done!${OFF}"
