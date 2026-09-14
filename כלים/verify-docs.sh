#!/usr/bin/env bash
# Generic documentation checks — no network, no database, no project knowledge.
#
# This is the half of the verification that is true for every project, so it
# lives in the toolkit rather than inside any one of them. Project-specific
# checks (RLS, triggers, schema-to-doc agreement) stay with their project and
# are run separately.
#
# Everything here is READ-ONLY. It never writes, moves or deletes anything.
#
# Why it exists: the project's own verify.sh needs SSH to a server, so when the
# network is down every check fails — including the four that need no network at
# all. A check that only runs when you remember to run it is a promise, and the
# whole point of this method is that promises break.
#
#   bash כלים/verify-docs.sh              # every project under myProjekts/
#   bash כלים/verify-docs.sh <path>       # one project
#
# Exits non-zero if any check fails, so it can be wired into a session-close hook.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }
info() { printf '  \033[90m·\033[0m %s\n' "$1"; }

# Which index should a file be listed in? A subdirectory with its own INDEX.md
# owns its files; everything else answers to the docs/ index. This mirrors how
# entities/ carries its own index while decisions/ does not.
index_for() {
  local dir="$1" docs="$2"
  if [ -f "$dir/INDEX.md" ]; then printf '%s' "$dir/INDEX.md"
  else printf '%s' "$docs/INDEX.md"; fi
}

check_project() {
  local proj="$1"
  local docs="$proj/docs"
  local name
  name="$(basename "$proj")"

  [ -d "$docs" ] || { info "$name — no docs/, skipped"; return; }
  printf '\n\033[1m── %s ──\033[0m\n' "$name"

  # 1. Every documentation file is listed in the index that owns it.
  local missing=""
  while IFS= read -r f; do
    local base idx
    base="$(basename "$f")"
    [ "$base" = "INDEX.md" ] && continue
    idx="$(index_for "$(dirname "$f")" "$docs")"
    [ -f "$idx" ] || continue
    grep -qF "$base" "$idx" || missing="$missing\n      ${f#$proj/} → $(basename "$(dirname "$idx")")/$(basename "$idx")"
  done < <(find "$docs" -name '*.md' -type f)

  [ -z "$missing" ] && ok "every doc is listed in its index" \
    || { bad "docs missing from their index:"; printf "$missing\n"; }

  # 2. Code that the docs are supposed to account for: migrations, seeds,
  #    scripts. Only checked when the project actually has them.
  local undoc=""
  while IFS= read -r d; do
    while IFS= read -r f; do
      local base
      base="$(basename "$f")"
      grep -qF "$base" "$docs/INDEX.md" 2>/dev/null || undoc="$undoc ${base}"
    done < <(find "$d" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.sh' \) 2>/dev/null)
  done < <(find "$proj" -type d \( -name migrations -o -name seeds -o -name scripts \) 2>/dev/null)

  if [ -n "$undoc" ]; then bad "not listed in docs/INDEX.md:$undoc"
  else ok "every migration, seed and script is listed"; fi

  # 3. Internal links actually resolve. Markdown happily points at nothing.
  local broken=""
  while IFS= read -r f; do
    local d
    d="$(dirname "$f")"
    while IFS= read -r l; do
      # Strip the URL-encoding markdown needs for spaces in Hebrew paths.
      local target="${l//\%20/ }"
      [ -e "$d/$target" ] || broken="$broken\n      ${f#$proj/} → $l"
    done < <(grep -oE '\]\(<?[^)#][^)]*\.md>?\)' "$f" 2>/dev/null \
             | sed 's/^](//; s/)$//; s/^<//; s/>$//' \
             | grep -v '^https\?://')
  done < <(find "$docs" -name '*.md' -type f)

  [ -z "$broken" ] && ok "no broken internal links" \
    || { bad "broken links:"; printf "$broken\n"; }
}

printf '\033[1m═══ documentation checks ═══\033[0m\n'

if [ $# -ge 1 ]; then
  check_project "$(cd "$1" && pwd)"
else
  while IFS= read -r p; do check_project "$p"; done \
    < <(find "$ROOT/myProjekts" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
fi

# Work that exists in exactly one copy is the failure this whole method was
# written to stop. Reported last so it is the line left on screen.
printf '\n\033[1m── not yet saved ──\033[0m\n'
unsaved="$(git -C "$ROOT" status --porcelain 2>/dev/null)"
if [ -z "$unsaved" ]; then
  ok "working tree is clean"
else
  bad "uncommitted — these exist in one copy only:"
  printf '%s\n' "$unsaved" | sed 's/^/      /'
fi

printf '\n'
[ "$FAIL" = "0" ] && printf '\033[32mAll checks passed.\033[0m\n' \
                  || printf '\033[31mSome checks failed — see above.\033[0m\n'
exit $FAIL
