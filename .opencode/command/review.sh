#!/usr/bin/env bash

# ==============================================================================
# Git Context Switcher
# A structured wrapper for viewing git contexts (diffs, logs, PRs)
# ==============================================================================

set -euo pipefail

PROG_NAME="$(basename "$0")"
readonly PROG_NAME

# --- Styles & Constants -------------------------------------------------------
if [[ -t 1 ]]; then
  # Reset
  Color_Off=$'\033[0m'      # Text Reset

  # Regular Colors
  Red=$'\033[0;31m'         # Red
  Green=$'\033[0;32m'       # Green

  # Bold
  BBlue=$'\033[1;34m'       # Blue
  BCyan=$'\033[1;36m'       # Cyan

  # Text Formatting
  Bold=$'\033[1m'           # Bold
  Dim=$'\033[2m'            # Dim/Faint
else
  # No TTY - disable all colors
  Color_Off='' Red='' Green='' BBlue='' BCyan='' Bold='' Dim=''
fi

readonly Color_Off Red Green BBlue BCyan Bold Dim

# --- Helpers ------------------------------------------------------------------

log_header() {
  echo -e "\n${BBlue}=== $1 ===${Color_Off}"
}

log_sub() {
  echo -e "${Dim}--- $1 ---${Color_Off}"
}

error() {
  echo -e "${Red}${Bold}ERROR:${Color_Off} $1" >&2
  exit 1
}

check_deps() {
  command -v git >/dev/null 2>&1 || error "Git is not installed."
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || error "Not a git repository."
}

get_base_branch() {
  # Try to detect main/master automatically from remote HEAD
  git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null |
    sed 's@^refs/remotes/origin/@@' |
    grep . ||
    echo "master" # Fallback
}

# --- usage --------------------------------------------------------------------

show_usage() {
  cat <<EOF
${Bold}Usage:${Color_Off} ${PROG_NAME} [scope] [ref]

${Bold}Scopes:${Color_Off}
  ${Green}all${Color_Off}       All uncommitted changes (default)
  ${Green}staged${Color_Off}    Only staged changes
  ${Green}unstaged${Color_Off}  Only unstaged changes
  ${Green}commit${Color_Off}    Show specific commit (requires ref arg)
  ${Green}branch${Color_Off}    Compare current branch to base (auto-detected, defaults to master)
  ${Green}pr${Color_Off}        Full PR review (requires gh cli)

${Bold}Examples:${Color_Off}
  ${PROG_NAME}                  ${Dim}# View all local changes${Color_Off}
  ${PROG_NAME} branch           ${Dim}# Compare to master${Color_Off}
  ${PROG_NAME} commit a1b2c3d   ${Dim}# Inspect commit${Color_Off}
  ${PROG_NAME} pr 42            ${Dim}# View PR details${Color_Off}
EOF
  exit 0
}

# --- Modes --------------------------------------------------------------------

mode_staged() {
  log_header "STAGED CHANGES"
  git --no-pager diff --staged --color=always
}

mode_unstaged() {
  log_header "UNSTAGED CHANGES"
  git --no-pager diff --color=always
}

mode_all() {
  log_header "ALL UNCOMMITTED CHANGES"
  git --no-pager diff HEAD --color=always
}

mode_commit() {
  local ref="${1:-}"
  [[ -z "${ref}" ]] && error "Commit hash required. Usage: ${PROG_NAME} commit <hash>"

  git rev-parse --verify "${ref}" >/dev/null 2>&1 || error "Invalid ref: ${ref}"

  log_header "COMMIT: ${ref}"
  git --no-pager show "${ref}" --color=always
}

mode_branch() {
  local base current
  base=$(get_base_branch)
  current=$(git rev-parse --abbrev-ref HEAD)

  if [[ "${current}" == "${base}" ]]; then
    echo -e "${Green}You are on the base branch (${base}). No diffs to show.${Color_Off}"
    exit 0
  fi

  log_header "${current^^} vs ${base^^}"

  log_sub "Commits"
  git --no-pager log --oneline --graph --color=always "${base}..${current}"

  log_sub "Changed Files"
  git --no-pager diff --name-status "${base}...${current}"

  log_sub "Diff (Triple-Dot)"
  git --no-pager diff --color=always "${base}...${current}"
}

mode_pr() {
  local pr_num="${1:-}"
  [[ -z "${pr_num}" ]] && error "PR number/url required."

  if ! command -v gh >/dev/null 2>&1; then
    error "GitHub CLI (gh) is required for 'pr' mode."
  fi

  log_header "PULL REQUEST #${pr_num}"

  # Go template for clean output
  local template="
{{printf \"${BCyan}#%v %s${Color_Off}\" .number .title}}
{{.body}}

{{if .assignees}}{{printf \"${Bold}Assignees:${Color_Off}\"}}{{range .assignees}}
  - {{.login}}{{end}}{{else}}{{printf \"${Dim}No Assignees${Color_Off}\"}}{{end}}

{{if .reviews}}{{printf \"\n${Bold}Reviews:${Color_Off}\"}}{{range .reviews}}
  - {{printf \"%-15s\" .author.login}} [{{.state}}] {{.body}}{{end}}{{else}}{{printf \"\n${Dim}No Reviews${Color_Off}\"}}{{end}}
"
  gh pr view "${pr_num}" \
    --json number,title,body,reviews,assignees \
    --template "${template}"
}

# --- Main Dispatch ------------------------------------------------------------

main() {
  check_deps

  local scope="${1:-all}"
  local ref="${2:-}"

  # Handle help flags
  [[ "${scope}" =~ ^(-h|--help)$ ]] && show_usage

  case "${scope}" in
  staged) mode_staged ;;
  unstaged) mode_unstaged ;;
  all) mode_all ;;
  commit | committed) mode_commit "${ref}" ;;
  branch) mode_branch ;;
  pr) mode_pr "${ref}" ;;
  *)
    # If the user typed something weird,
    # assume they might mean a file path for "all"
    if [[ -e "${scope}" ]]; then
      log_header "FILE DIFF: ${scope}"
      git --no-pager diff HEAD -- "${scope}"
    else
      error "Unknown scope: '${scope}'. See --help."
    fi
    ;;
  esac
}

main "$@"
