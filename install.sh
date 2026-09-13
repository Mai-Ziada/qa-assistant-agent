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
UPDATE=0
HOST=auto
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options] [project-dir]

  --skills-only      install the agent and skills into ~/.claude, skip the workspace
  --workspace-only   scaffold the project workspace only, skip ~/.claude
  --update           git pull this repo first, then install (self-updating)
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
    --update) UPDATE=1; SKILLS_ONLY=1 ;;
    --host) shift; HOST="${1:-}" ;;
    --host=*) HOST="${1#*=}" ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage; exit 2 ;;
    *) PROJECT="$1" ;;
  esac
  shift
done

case "$HOST" in
  auto|claude|codex|both) ;;
  *) echo "unknown --host: $HOST (use claude, codex, both, or auto)" >&2; exit 2 ;;
esac

# Which hosts to write to. auto = every one already on this machine.
DO_CLAUDE=0; DO_CODEX=0
case "$HOST" in
  claude) DO_CLAUDE=1 ;;
  codex)  DO_CODEX=1 ;;
  both)   DO_CLAUDE=1; DO_CODEX=1 ;;
  auto)
    [ -d "$HOME/.claude" ] && DO_CLAUDE=1
    [ -d "$CODEX_HOME" ]   && DO_CODEX=1
    # Neither present yet: install Claude, the default host.
    if [ "$DO_CLAUDE" -eq 0 ] && [ "$DO_CODEX" -eq 0 ]; then DO_CLAUDE=1; fi
    ;;
esac

# --update: refresh the repo itself first, so one command covers pull + install.
# $REPO is this script's own directory, so it works from anywhere.
if [ "$UPDATE" -eq 1 ]; then
  if [ -d "$REPO/.git" ]; then
    printf '
Updating %s
' "$REPO"
    git -C "$REPO" pull --ff-only || {
      echo "  git pull failed — resolve it in $REPO, then re-run" >&2; exit 1; }
  else
    echo "  not a git checkout, skipping pull: $REPO" >&2
  fi
fi

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

# ---------------------------------------------------------------- hosts
# Install the agent, the skills, the shared reference, and the workspace
# templates into one host directory. Called once per host, so Claude and Codex
# get byte-identical content and an update refreshes both the same way.
install_host() {
  local host="$1" root="$2" skills_dir="$3"

  head_ "Skills and agent -> $root"
  mkdir -p "$skills_dir" "$root/qa-assistant"

  cp -r "$REPO/skills/." "$skills_dir/"
  say "installed  $(find "$REPO/skills" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ') skills"

  # The agent definition. Claude reads agents/ directly; Codex has no such
  # directory, so it travels inside the entry-point skill, which is where the
  # skill already looks for it on that host.
  if [ "$host" = "claude" ]; then
    mkdir -p "$root/agents"
    cp "$REPO/agents/qa-assistant.md" "$root/agents/"
    say "installed  agents/qa-assistant.md"
  else
    mkdir -p "$skills_dir/qa-assistant/agents"
    cp "$REPO/agents/qa-assistant.md" "$skills_dir/qa-assistant/agents/"
    say "installed  qa-assistant/agents/qa-assistant.md"
  fi

  # Workspace templates, once, at agent level. A skill running in a project with
  # no .qa/ scaffolds one from here, so it never depends on the cloned repo.
  mkdir -p "$root/qa-assistant/workspace-templates"
  cp "$TPL"/index.md "$TPL"/project-context.md "$TPL"/memory.md      "$TPL"/knowledge-README.md "$TPL"/screenshots-README.md "$TPL"/qa-output-README.md      "$TPL"/gitignore-block "$TPL"/test-data-README.md "$TPL"/mcp.json "$TPL"/mcp.json.example      "$root/qa-assistant/workspace-templates/"
  say "installed  workspace templates"

  # Shared references every skill reads. Not skills: no SKILL.md, so they are
  # never slash commands and never listed. One copy each, not one per skill.
  cp "$REPO/install/shared/foundation.md" "$REPO/install/shared/updating-the-workspace.md"      "$root/qa-assistant/"
  say "installed  foundation.md  updating-the-workspace.md"
}

if [ "$WORKSPACE_ONLY" -eq 0 ]; then
  [ "$DO_CLAUDE" -eq 1 ] && install_host claude "$HOME/.claude" "$HOME/.claude/skills"
  [ "$DO_CODEX"  -eq 1 ] && install_host codex  "$CODEX_HOME"   "$CODEX_HOME/skills"

  if [ "$DO_CODEX" -eq 1 ]; then
    say ""
    say "Codex: skills and agent are installed. The routing block for"
    say "~/.codex/AGENTS.md is in INSTALL-CODEX.md — add it once, by hand."
  fi
fi

# ------------------------------------------------------------- workspace
if [ "$SKILLS_ONLY" -eq 0 ]; then
  head_ "Workspace -> $PROJECT"
  cd "$PROJECT"

  mkdir -p .qa/knowledge/sources .qa/screenshots .qa/test-data qa-output
  say "created  .qa/knowledge/sources/  .qa/screenshots/  .qa/test-data/  qa-output/"

  place "$TPL/index.md"           ".qa/index.md"           ".qa/index.md"
  place "$TPL/project-context.md" ".qa/project-context.md" ".qa/project-context.md"
  place "$TPL/memory.md"          ".qa/memory.md"          ".qa/memory.md"
  place "$TPL/knowledge-README.md" ".qa/knowledge/README.md" ".qa/knowledge/README.md"
  place "$TPL/screenshots-README.md" ".qa/screenshots/README.md" ".qa/screenshots/README.md"
  place "$TPL/qa-output-README.md" "qa-output/README.md"   "qa-output/README.md"
  place "$TPL/test-data-README.md" ".qa/test-data/README.md" ".qa/test-data/README.md"
  place "$TPL/mcp.json.example"   ".mcp.json.example"      ".mcp.json.example"
  place "$TPL/mcp.json"           ".mcp.json"              ".mcp.json"

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
