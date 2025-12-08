#!/usr/bin/env bash
# shellcheck disable=SC2154 # GITHUB_OUTPUT, GITHUB_STEP_SUMMARY are GitHub Actions runtime env vars
set -euo pipefail

# Validate package.json exists
[[ -f package.json ]] || { echo "::error::No package.json found"; exit 1; }

# Extract and validate package metadata
PKG_NAME="$(jq -r '.name // empty' package.json)" || {
  echo "::error::Failed to parse package.json with jq"
  exit 1
}
PKG_VERSION="$(jq -r '.version // empty' package.json)" || {
  echo "::error::Failed to parse package.json with jq"
  exit 1
}

if [[ -z "${PKG_NAME}" ]]; then
  echo "::error::Package name is empty or missing in package.json"
  exit 1
fi
if [[ -z "${PKG_VERSION}" ]]; then
  echo "::error::Package version is empty or missing in package.json"
  exit 1
fi

# Validate TAG (default to "latest" if unset)
TAG="${TAG:-latest}"
if [[ -z "${TAG}" ]]; then
  echo "::error::TAG is empty"
  exit 1
fi

# Validate DRY_RUN is boolean
DRY_RUN="${DRY_RUN:-false}"
if [[ "${DRY_RUN}" != "true" && "${DRY_RUN}" != "false" ]]; then
  echo "::error::DRY_RUN must be 'true' or 'false', got: ${DRY_RUN}"
  exit 1
fi

# Output package info
echo "package-name=${PKG_NAME}" | tee -a "${GITHUB_OUTPUT}"
echo "package-version=${PKG_VERSION}" | tee -a "${GITHUB_OUTPUT}"
echo "Publishing ${PKG_NAME}@${PKG_VERSION} with tag '${TAG}'" | tee -a "${GITHUB_STEP_SUMMARY}"

# Build publish flags after validation
FLAGS=(--access public --tag "${TAG}")

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "Dry-run mode enabled"
  npm publish "${FLAGS[@]}" --dry-run
else
  # Check npm version for --provenance support (requires >= 9.5.0)
  NPM_VERSION="$(npm --version)"
  NPM_MAJOR="${NPM_VERSION%%.*}"
  NPM_REST="${NPM_VERSION#*.}"
  NPM_MINOR="${NPM_REST%%.*}"

  if [[ "${NPM_MAJOR}" -gt 9 ]] || { [[ "${NPM_MAJOR}" -eq 9 ]] && [[ "${NPM_MINOR}" -ge 5 ]]; }; then
    npm publish "${FLAGS[@]}" --provenance
  else
    echo "::warning::npm ${NPM_VERSION} does not support --provenance (requires >= 9.5.0), publishing without it"
    npm publish "${FLAGS[@]}"
  fi
fi
