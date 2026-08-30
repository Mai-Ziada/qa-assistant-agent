#!/usr/bin/env bash
# QA Assistant installer.
#   Skills + agent  -> ~/.claude/  (once, shared by every project)
#   Workspace       -> the target project directory
# Safe to re-run: existing files are never overwritten unless --force is passed.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPL="$REPO/install/templates"
PROJECT="$(pwd)"
FORCE=0
SKILLS_ONLY=0
WORKSPACE_ONLY=0

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options] [project-dir]

  --skills-only      install the agent and skills into ~/.claude, skip the workspace
  --workspace-only   scaffold the project workspace only, skip ~/.claude
  --force            overwrite existing files (default: never overwrite)
  -h, --help         show this help

With no project-dir, the current directory is used.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1 ;;
    --skills-only) SKILLS_ONLY=1 ;;
    --workspace-only) WORKSPACE_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage; exit 2 ;;
    *) PROJECT="$1" ;;
  esac
  shift
done

say()  { printf '  %s\n' "$1"; }
head_() { printf '\n%s\n' "$1"; }

# Copy a file only when absent, unless --force. Reports what it did.
place() {
  local src="$1" dst="$2" label="$3"
  if [ -e "$dst" ] && [ "$FORCE" -eq 0 ]; then
    say "kept     $label (already exists)"
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    say "created  $label"
  fi
}

# ---------------------------------------------------------------- skills
if [ "$WORKSPACE_ONLY" -eq 0 ]; then
  head_ "Skills and agent -> ~/.claude"
  mkdir -p "$HOME/.claude/agents" "$HOME/.claude/skills"
  cp "$REPO/agents/qa-assistant.md" "$HOME/.claude/agents/"
  say "installed  agents/qa-assistant.md"
  cp -r "$REPO/skills/." "$HOME/.claude/skills/"
  say "installed  $(find "$REPO/skills" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ') skills"
fi

# ------------------------------------------------------------- workspace
if [ "$SKILLS_ONLY" -eq 0 ]; then
  head_ "Workspace -> $PROJECT"
  cd "$PROJECT"

  mkdir -p .qa/knowledge .qa/screenshots qa-output
  say "created  .qa/knowledge/  .qa/screenshots/  qa-output/"

  place "$TPL/index.md"           ".qa/index.md"           ".qa/index.md"
  place "$TPL/project-context.md" ".qa/project-context.md" ".qa/project-context.md"
  place "$TPL/memory.md"          ".qa/memory.md"          ".qa/memory.md"
  place "$TPL/knowledge-README.md" ".qa/knowledge/README.md" ".qa/knowledge/README.md"
  place "$TPL/screenshots-README.md" ".qa/screenshots/README.md" ".qa/screenshots/README.md"
  place "$TPL/qa-output-README.md" "qa-output/README.md"   "qa-output/README.md"
  place "$TPL/mcp.json.example"   ".mcp.json.example"      ".mcp.json.example"
  place "$TPL/mcp.json.example"   ".mcp.json"              ".mcp.json"

  # .gitignore — append our block only if it is not already there
  MARK="# --- QA Assistant ---"
  if [ -f .gitignore ] && grep -qF "$MARK" .gitignore; then
    say "kept     .gitignore (QA Assistant block already present)"
  else
    [ -f .gitignore ] && printf '\n' >> .gitignore
    cat "$TPL/gitignore-block" >> .gitignore
    say "updated  .gitignore (appended QA Assistant block)"
  fi
fi

head_ "Done."
cat <<'NEXT'
  1. Put your real MCP credentials in .mcp.json  (git-ignored)
  2. Fill in .qa/project-context.md              (the agent keeps it and .qa/index.md current from here on)
  3. Restart the session, then run:  /qa-assistant
NEXT
