#!/usr/bin/env bash

set -euo pipefail

# Get script's name
SCRIPT_NAME=$(basename "$0")

# Default values
scope="${1:-all}"
ref="${2:-HEAD}"

# Show help
if [[ "${scope}" == "--help" || "${scope}" == "-h" ]]; then
  {
    echo "Usage: ${SCRIPT_NAME} [scope] [ref]"
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
    echo "  ${SCRIPT_NAME}                  # all uncommitted changes"
    echo "  ${SCRIPT_NAME} staged           # staged changes only"
    echo "  ${SCRIPT_NAME} commit [HASH]    # show specific commit"
    echo "  ${SCRIPT_NAME} pr [NUMBER]      # full PR review"
    exit 0
  }
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
    git --no-pager diff --staged
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
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "${current_branch}" == "${base}" ]]; then
      echo "You are on the base branch (${base}). No changes to show."
      exit 0
    fi
    echo "=== ${current_branch^^} vs ${base^^} ==="
    echo "--- Commits ---"
    git --no-pager log --oneline "${base}..${current_branch}"
    echo -e "\n--- Changed Files ---"
    git --no-pager diff --name-status "${base}...${current_branch}"
    echo -e "\n--- Diff ---"
    git --no-pager diff "${base}...${current_branch}"
    ;;
  pr)
    gh pr view "${ref}" --json number,title,body,reviews,assignees --template \
      '{{printf "#%v" .number}} {{.title}}

      {{.body}}

      {{tablerow "ASSIGNEE" "NAME"}}{{range .assignees}}{{tablerow .login .name}}{{end}}{{tablerender}}
      {{tablerow "REVIEWER" "STATE" "COMMENT"}}{{range .reviews}}{{tablerow .author.login .state .body}}{{end}}
      '
    ;;
  all | *)
    echo "=== ALL UNCOMMITTED CHANGES ==="
    git --no-pager diff HEAD
    ;;
esac
