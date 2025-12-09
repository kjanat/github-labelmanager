#!/usr/bin/env bash
# shellcheck disable=SC2154  # env vars from action

JSON_VERSION=$(jq -r '.version' deno.json)

# Separate concepts: IS_PUSH = event type, IS_TAG = ref is a version tag (starts with "v")
IS_PUSH=false
IS_TAG=false
if [[ "${EVENT_NAME}" == "push" ]]; then
  IS_PUSH=true
  # Guard: push events must have REF_NAME starting with "v"
  if [[ "${REF_NAME}" != v* ]]; then
    echo "::error::Push event requires REF_NAME to start with 'v', got: ${REF_NAME}"
    exit 1
  fi
  IS_TAG=true
fi

if [[ "${EVENT_NAME}" == "pull_request" ]]; then
  echo "PR mode: version from deno.json: ${JSON_VERSION}"
  VERSION="v${JSON_VERSION}"
else
  VERSION="${REF_NAME}"
  SEMVER="${VERSION#v}"
  echo "Tag version: ${SEMVER}"
  echo "deno.json version: ${JSON_VERSION}"
  if [[ "${SEMVER}" != "${JSON_VERSION}" ]]; then
    echo "::error::Version mismatch: tag=${SEMVER}, deno.json=${JSON_VERSION}"
    exit 1
  fi
fi

IS_PRERELEASE=false
IS_STABLE=false
if [[ "${VERSION}" == *-* ]]; then
  IS_PRERELEASE=true
elif [[ "${IS_TAG}" == "true" ]]; then
  IS_STABLE=true
fi

MODE="dry-run"
if [[ "${IS_TAG}" == "true" ]]; then
  MODE="publish"
fi

{
  echo "version=${VERSION}"
  echo "is_push=${IS_PUSH}"
  echo "is_tag=${IS_TAG}"
  echo "prerelease=${IS_PRERELEASE}"
  echo "is_stable=${IS_STABLE}"
  echo "mode=${MODE}"
} >> "${GITHUB_OUTPUT}"
