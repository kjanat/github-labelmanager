#!/usr/bin/env bash

set -euo pipefail

scope="${1:-all}"
ref="${2:-HEAD}"

# Show help
if [[ "${scope}" == "--help" || "${scope}" == "-h" ]]; then
  echo "Usage: review.sh [scope] [ref]"
  echo ""
  echo "Scopes:"
  echo "  all       - All uncommitted changes (default)"
  echo "  staged    - Only staged changes"
  echo "  unstaged  - Only unstaged changes"
  echo "  commit    - Show specific commit (use ref for commit hash)"
  echo "  branch    - Compare current branch to base branch"
  echo "  pr        - Full PR review (commits, stats, diff)"
  echo ""
  echo "Examples:"
  echo "  review.sh                  # all uncommitted changes"
  echo "  review.sh staged           # staged changes only"
  echo "  review.sh commit abc123    # show specific commit"
  echo "  review.sh pr               # full PR review"
  exit 0
fi

# Detect default branch (master/main)
base=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")

# Validate ref exists for commit mode
validate_ref() {
  git rev-parse --verify "${1}" >/dev/null 2>&1 || {
    echo "Invalid ref: ${1}" >&2
    exit 1
  }
}

case "${scope}" in
  staged)
    echo "=== STAGED CHANGES ==="
    git --no-pager diff --cached
    ;;
  unstaged)
    echo "=== UNSTAGED CHANGES ==="
    git --no-pager diff
    ;;
  commit | committed)
    validate_ref "${ref}"
    echo "=== COMMIT: ${ref} ==="
    git --no-pager show "${ref}"
    ;;
  branch)
    echo "=== BRANCH vs ${base^^} ==="
    echo "--- Commits ---"
    git --no-pager log --oneline "${base}..HEAD"
    echo -e "\n--- Changed Files ---"
    git --no-pager diff --name-status "${base}...HEAD"
    echo -e "\n--- Diff ---"
    git --no-pager diff "${base}...HEAD"
    ;;
  pr)
    echo "=== PR REVIEW ==="
    echo "--- Commits ---"
    git --no-pager log --oneline "${base}..HEAD"
    echo -e "\n--- Stats ---"
    git --no-pager diff --stat "${base}...HEAD"
    echo -e "\n--- Changed Files ---"
    git --no-pager diff --name-status "${base}...HEAD"
    echo -e "\n--- Full Diff ---"
    git --no-pager diff "${base}...HEAD"
    ;;
  all | *)
    echo "=== ALL UNCOMMITTED CHANGES ==="
    git --no-pager diff HEAD
    ;;
esac
