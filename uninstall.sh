#!/usr/bin/env bash
# QA Assistant uninstaller.
#   Removes the agent and skills from every host present (~/.claude and $CODEX_HOME),
#   and the scaffolding from a project.
#   Your work -- .qa/ and qa-output/ -- is KEPT unless you explicitly ask for it to go.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(pwd)"
YES=0
PURGE_WORK=0
SKILLS_ONLY=0
WORKSPACE_ONLY=0

SKILLS="qa-assistant qa-story-review qa-create-tc qa-run-tc api-testing Smart_ReTest qa-system-explorer"

usage() {
  cat <<'USAGE'
Usage: ./uninstall.sh [options] [project-dir]

  --skills-only      remove from ~/.claude only, leave the project untouched
  --workspace-only   remove the project scaffolding only, leave ~/.claude untouched
  --purge-work       ALSO delete .qa/ and qa-output/ -- your analyses, test cases,
                     run reports, knowledge and evidence. This cannot be undone.
  --yes              skip the confirmation prompt
  -h, --help         show this help

With no project-dir, the current directory is used.

By default your work is KEPT: .qa/ and qa-output/ stay exactly where they are.
Only the agent, the skills, and the .gitignore block are removed.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --purge-work) PURGE_WORK=1 ;;
    --skills-only) SKILLS_ONLY=1 ;;
    --workspace-only) WORKSPACE_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage; exit 2 ;;
    *) PROJECT="$1" ;;
  esac
  shift
done

say()   { printf '  %s\n' "$1"; }
head_() { printf '\n%s\n' "$1"; }

# Remove a path only if it exists; report either way.
drop() {
  local target="$1" label="$2"
  if [ -e "$target" ]; then
    rm -rf "$target"
    say "removed  $label"
  else
    say "absent   $label"
  fi
}

# ------------------------------------------------------------- plan and confirm
head_ "This will remove:"
[ "$WORKSPACE_ONLY" -eq 0 ] && {
  say "~/.claude/agents/qa-assistant.md"
  say "~/.claude/skills/{$(echo $SKILLS | tr ' ' ',')}"
}
[ "$SKILLS_ONLY" -eq 0 ] && {
  say "the QA Assistant block in $PROJECT/.gitignore"
  if [ "$PURGE_WORK" -eq 1 ]; then
    printf '\n'
    say "AND PERMANENTLY DELETE YOUR WORK:"
    say "  $PROJECT/.qa/         context, memory, index, knowledge, screenshots"
    say "  $PROJECT/qa-output/   analyses, test cases, run reports"
  fi
}

head_ "This will KEEP:"
[ "$SKILLS_ONLY" -eq 0 ] && [ "$PURGE_WORK" -eq 0 ] && {
  say ".qa/  and  qa-output/   -- your work stays"
}
say ".mcp.json  -- your credentials are never touched"

if [ "$YES" -eq 0 ]; then
  reply=""
  if [ ! -t 0 ]; then
    # stdin is a pipe or file: read the answer from it. If it is closed or
    # empty there is no answer, so treat that as a refusal rather than a yes.
    printf '\nProceed? [y/N] '
    if ! read -r reply; then
      printf '\nNo answer on stdin. Nothing was removed.\n'
      printf 'Re-run with --yes if you are sure.\n'
      exit 1
    fi
  elif [ -r /dev/tty ]; then
    printf '\nProceed? [y/N] '
    read -r reply < /dev/tty || reply=""
  else
    printf '\nNo terminal available to confirm. Nothing was removed.\n'
    printf 'Re-run with --yes if you are sure.\n'
    exit 1
  fi
  case "$reply" in
    [yY]|[yY][eE][sS]) ;;
    *) printf '\nCancelled. Nothing was removed.\n'; exit 0 ;;
  esac
fi

# -------------------------------------------------------------------- hosts
# Remove from every host present, mirroring the installer.
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

remove_host() {
  local root="$1" skills_dir="$2"
  [ -d "$root" ] || return 0
  head_ "Removing from $root"
  drop "$root/agents/qa-assistant.md" "agents/qa-assistant.md"
  for s in $SKILLS; do
    drop "$skills_dir/$s" "skills/$s"
  done
  # Shared reference and workspace templates. Removed only when the directory
  # holds nothing else, so a hand-added file is never taken with it.
  drop "$root/qa-assistant/foundation.md" "qa-assistant/foundation.md"
  drop "$root/qa-assistant/updating-the-workspace.md" "qa-assistant/updating-the-workspace.md"
  drop "$root/qa-assistant/workspace-templates" "qa-assistant/workspace-templates"
  rmdir "$root/qa-assistant" 2>/dev/null && say "qa-assistant/ (empty)" || true
}

if [ "$WORKSPACE_ONLY" -eq 0 ]; then
  remove_host "$HOME/.claude" "$HOME/.claude/skills"
  remove_host "$CODEX_HOME"   "$CODEX_HOME/skills"
fi

# ------------------------------------------------------------------- project
if [ "$SKILLS_ONLY" -eq 0 ]; then
  head_ "Removing from $PROJECT"
  cd "$PROJECT"

  # Strip our .gitignore block, leaving every other rule intact.
  if [ -f .gitignore ] && grep -qF "# --- QA Assistant ---" .gitignore; then
    awk '
      /^# --- QA Assistant ---$/ { skip=1 }
      skip && /^# Kept in git on purpose:/ { skip=0; next }
      !skip { print }
    ' .gitignore > .gitignore.tmp
    # drop a trailing blank line left behind
    awk 'NF||NR<n' n="$(wc -l < .gitignore.tmp)" .gitignore.tmp > .gitignore
    rm -f .gitignore.tmp
    say "removed  QA Assistant block from .gitignore"
  else
    say "absent   QA Assistant block in .gitignore"
  fi

  if [ "$PURGE_WORK" -eq 1 ]; then
    drop ".qa" ".qa/"
    drop "qa-output" "qa-output/"
  else
    say "kept     .qa/  and  qa-output/  (use --purge-work to delete)"
  fi

  say "kept     .mcp.json  (your credentials)"
fi

head_ "Done."
if [ "$SKILLS_ONLY" -eq 0 ] && [ "$PURGE_WORK" -eq 0 ]; then
  cat <<'NEXT'
  Your work is still in .qa/ and qa-output/.
  Reinstalling later picks up exactly where you left off.
NEXT
fi
