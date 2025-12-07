#!/usr/bin/env bash
# shellcheck disable=SC2154  # unassigned environment variables

[[ -f package.json ]] || { echo "No package.json found"; exit 1; }

PKG_NAME="$(jq -r '.name' package.json)"
PKG_VERSION="$(jq -r '.version' package.json)"
FLAGS=(--access public --tag "${TAG}")

echo "package-name=${PKG_NAME}" | tee -a "${GITHUB_OUTPUT}"
echo "package-version=${PKG_VERSION}" | tee -a "${GITHUB_OUTPUT}"

echo "Publishing ${PKG_NAME}@${PKG_VERSION} with tag '${TAG}'" | tee -a "${GITHUB_STEP_SUMMARY}"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "Dry-run mode enabled"
  npm publish "${FLAGS[@]}" --dry-run
else
  npm publish "${FLAGS[@]}" --provenance
fi
