#!/usr/bin/env bash
# Documentation checks. No network, no database, read-only.
#
# Rewritten 2026-09-16 after an external review found that the previous
# version caught none of the four drifts this method was written about,
# and printed "All checks passed" after checking nothing at all.
#
# Every ceiling this project states in prose is enforced here instead.
# A ceiling written into a template is a promise; a ceiling checked is not.
#
# Limits may be overridden per project in docs/.limits (KEY=VALUE).
#
#   bash כלים/verify-docs.sh [project-path ...]
#
# Exits non-zero on any failure, and on having nothing to check.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
CHECKED=0
REPOS=""
DIRTY_FLAG="$ROOT/.verify-dirty"

ok()   { printf '  \033[32m/\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31mX\033[0m %s\n' "$1"; FAIL=1; }
note() { printf '  \033[90m.\033[0m %s\n' "$1"; }
# A warning is reported but never fails the run. For checks that can go
# red because time passed rather than because this change broke them.
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
list() { printf '%b\n' "$1" | sed 's/^/      /'; }

DEF_STATUS_MAX=60
DEF_RULES_MAX=15
DEF_EXPIRY_DAYS=30

# Decode %XX so links to non-ASCII filenames resolve instead of reading
# as broken. Hebrew paths are percent-encoded by most editors.
urldecode() { printf '%b' "${1//%/\\x}" 2>/dev/null || printf '%s' "$1"; }

# Whole-token match, so clients.md does not match old-clients.md.
listed_in() {
  local needle="$1" file="$2" esc
  esc=$(printf '%s' "$needle" | sed 's/[][\.*^$(){}?+|/]/\\&/g')
  grep -qE "(^|[^A-Za-z0-9_.-])${esc}([^A-Za-z0-9]|$)" "$file"
}

# Walk up to the docs root taking the first INDEX.md. The previous
# version only looked one level and skipped nested directories.
index_for() {
  local dir="$1" docs="$2"
  while [ "${#dir}" -ge "${#docs}" ]; do
    if [ -f "$dir/INDEX.md" ]; then printf '%s' "$dir/INDEX.md"; return; fi
    dir=$(dirname "$dir")
  done
  printf '%s' "$docs/INDEX.md"
}

check_project() {
  local proj="$1"
  local docs="$proj/docs"
  if [ ! -d "$docs" ]; then note "$(basename "$proj") - no docs/, skipped"; return; fi
  CHECKED=$((CHECKED + 1))
  printf '\n\033[1m-- %s --\033[0m\n' "$(basename "$proj")"

  local STATUS_MAX=$DEF_STATUS_MAX
  local RULES_MAX=$DEF_RULES_MAX
  local EXPIRY_DAYS=$DEF_EXPIRY_DAYS
  if [ -f "$docs/.limits" ]; then . "$docs/.limits"; fi

  # 1. every doc is listed in the index that owns it
  local missing=""
  while IFS= read -r f; do
    local base idx
    base=$(basename "$f")
    if [ "$base" = "INDEX.md" ]; then continue; fi
    idx=$(index_for "$(dirname "$f")" "$docs")
    if [ ! -f "$idx" ]; then continue; fi
    if ! listed_in "$base" "$idx"; then
      missing="$missing\n${f#$proj/} -> ${idx#$proj/}"
    fi
  done < <(find "$docs" -name '*.md' -type f)
  if [ -z "$missing" ]; then ok "every doc is listed in its index"
  else bad "docs missing from their index:"; list "$missing"; fi

  # 2. migrations, seeds and scripts are accounted for
  local undoc=""
  if [ -f "$docs/INDEX.md" ]; then
    while IFS= read -r f; do
      local base
      base=$(basename "$f")
      if ! listed_in "$base" "$docs/INDEX.md"; then undoc="$undoc\n$base"; fi
    done < <(find "$proj" -type d \( -name migrations -o -name seeds -o -name scripts \) -exec find {} -maxdepth 1 -type f \( -name '*.sql' -o -name '*.sh' \) \; 2>/dev/null)
    if [ -z "$undoc" ]; then ok "every migration, seed and script is listed"
    else bad "not listed in docs/INDEX.md:"; list "$undoc"; fi
  fi

  # 3. internal links resolve - anchors stripped, %XX decoded
  local broken=""
  while IFS= read -r f; do
    local d
    d=$(dirname "$f")
    while IFS= read -r l; do
      local target
      target=$(urldecode "${l%%#*}")
      if [ -z "$target" ]; then continue; fi
      if [ ! -e "$d/$target" ]; then broken="$broken\n${f#$proj/} -> $l"; fi
    done < <(grep -oE '\]\(<?[^)][^)]*>?\)' "$f" 2>/dev/null | sed 's/^](//; s/)$//; s/^<//; s/>$//' | grep -vE '^(https?:|mailto:|#)')
  done < <(find "$docs" -name '*.md' -type f)
  if [ -z "$broken" ]; then ok "no broken internal links"
  else bad "broken links:"; list "$broken"; fi

  # 4. the status ceiling - stated in the template, enforced here
  if [ -f "$docs/status.md" ]; then
    local n
    n=$(wc -l < "$docs/status.md")
    if [ "$n" -le "$STATUS_MAX" ]; then
      ok "status.md within its ceiling ($n/$STATUS_MAX lines)"
    else
      bad "status.md is $n lines, ceiling is $STATUS_MAX - it needs pruning, not appending"
    fi
  fi

  # 5. expiring-facts blocks that have gone stale.
  # Marked machine-readably so the check never depends on prose wording:
  #   <!-- expires-check: YYYY-MM-DD -->
  if grep -rq "expires-check:" "$docs" 2>/dev/null; then
    local stale="" now
    now=$(date +%s)
    while IFS= read -r line; do
      local f d ds age
      f=${line%%|*}
      d=${line##*|}
      ds=$(date -d "$d" +%s 2>/dev/null) || continue
      age=$(( (now - ds) / 86400 ))
      if [ "$age" -gt "$EXPIRY_DAYS" ]; then
        stale="$stale\n${f#$proj/} - dated $d, $age days old"
      fi
    done < <(grep -rn "expires-check:" "$docs" 2>/dev/null | sed -E 's/^([^:]*):[0-9]+:.*expires-check:[[:space:]]*([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1|\2/' | grep '|')
    if [ -z "$stale" ]; then ok "no expiring-facts block older than $EXPIRY_DAYS days"
    else warn "expiring facts past their date - verify or delete (warning, never blocks):"; list "$stale"; fi
  fi

  # 6. the waiting register: nothing closed over an open dependency
  local w="$proj/waiting.md"
  if [ -f "$w" ]; then
    local violations=""
    local done_ids
    done_ids=$(grep -E '^\|[[:space:]]*W-[0-9]+[[:space:]]*\|' "$w" 2>/dev/null | grep -iE '\|[[:space:]]*(done|closed)[[:space:]]*\|' | grep -oE 'W-[0-9]+' | head -100 || true)
    while IFS= read -r id; do
      if [ -z "$id" ]; then continue; fi
      local row deps
      row=$(grep -E "^\|[[:space:]]*$id[[:space:]]*\|" "$w" | head -1)
      deps=$(printf '%s' "$row" | grep -oE 'W-[0-9]+' | tail -n +2 || true)
      for dep in $deps; do
        if ! printf '%s\n' "$done_ids" | grep -qx "$dep"; then
          violations="$violations\n$id is marked done, but $dep is still open"
        fi
      done
    done < <(printf '%s\n' "$done_ids" | sort -u)
    if [ -z "$violations" ]; then ok "no item closed over an open dependency"
    else bad "dependency violations in waiting.md:"; list "$violations"; fi
  fi

  # 7. real personal or financial data must never enter the repository.
  #
  # This is the one failure on this list that cannot be undone. Everything
  # else is a file you edit and commit again; a client's ID number pushed
  # to a remote is in the history, on a server, and removing it means
  # rewriting history everywhere it was ever cloned.
  #
  # So it is checked before the commit, not after. Characterisation
  # documents describe fields; they must never carry rows.
  #
  # Add deliberate exceptions to docs/.pii-allow, one regex per line.
  local pii=""
  local allow="$docs/.pii-allow"
  local PII_RE='(^|[^0-9])([0-9]{9}|0(5[0-9]|[2-48-9])-?[0-9]{7})([^0-9]|$)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
  local hits=""

  # Patterns are bounded by non-digits on both sides. Without that, a
  # migration stamp like 20260901010000 reads as a phone number, and a
  # check that cries wolf is a check people learn to bypass.
  if [ "${VERIFY_STAGED:-0}" = "1" ]; then
    # Inside a pre-commit hook, the working tree is the wrong thing to
    # look at. A file can be staged carrying an ID number and then edited
    # clean afterwards: the working tree passes, and the commit still
    # contains it. --cached reads what is actually about to be committed.
    hits=$(git -C "$proj" grep --cached -nIE "$PII_RE" -- '*.md' '*.sql' '*.csv' '*.json' 2>/dev/null || true)
  else
    local scan
    # Only files git tracks. Local-only files (an access register, a
    # transcript kept off the remote) are excluded by definition, which is
    # the whole reason they are gitignored.
    scan=$(git -C "$proj" ls-files -- '*.md' '*.sql' '*.csv' '*.json' 2>/dev/null \
           | while IFS= read -r rel; do printf '%s/%s\n' "$proj" "$rel"; done)
    if [ -n "$scan" ]; then
      hits=$(printf '%s\n' "$scan" | while IFS= read -r f; do
        grep -HnE "$PII_RE" "$f" 2>/dev/null
      done)
    fi
  fi

  if [ -f "$allow" ]; then
    # A pattern file that is present but yields no usable pattern must not
    # be treated as "allow nothing" silently - say so, because an allow
    # file that quietly does nothing looks exactly like one that works.
    if ! grep -qvE '^[[:space:]]*(#|$)' "$allow"; then
      note "$(basename "$allow") contains no patterns - nothing is being allowed"
    fi
  fi
  if true; then
    if [ -n "$hits" ] && [ -f "$allow" ]; then
      # Strip comments and blank lines first. An empty line in a pattern
      # file matches everything, so a single stray newline would silently
      # allow every finding - the exact failure this check exists to stop.
      local pats
      pats=$(grep -vE '^[[:space:]]*(#|$)' "$allow")
      if [ -n "$pats" ]; then
        hits=$(printf '%s\n' "$hits" | grep -vE "$(printf '%s' "$pats" | paste -sd'|' -)" || true)
      fi
    fi
    if [ -n "$hits" ]; then
      pii=$(printf '%s\n' "$hits" | head -20 | sed "s|^$proj/||")
    fi
  fi
  if [ -z "$pii" ]; then
    ok "no personal or financial data found in tracked files"
  else
    bad "possible real client data - this cannot be undone once pushed:"
    list "$pii"
    note "if a match is deliberate, add a regex to docs/.pii-allow"
  fi

  # 8. remember which repo this project actually lives in.
  # The previous version checked the toolkit repo for every project.
  local top
  if top=$(git -C "$proj" rev-parse --show-toplevel 2>/dev/null); then
    case "$REPOS" in
      *"|$top|"*) ;;
      *) REPOS="$REPOS|$top|" ;;
    esac
  fi
}

check_rules() {
  local rf n
  for rf in "$ROOT/כללי-עבודה.md" "$ROOT/CLAUDE.md" "$ROOT/rules.md"; do
    if [ ! -f "$rf" ]; then continue; fi
    printf '\n\033[1m-- %s --\033[0m\n' "$(basename "$rf")"
    n=$(grep -cE '^[0-9]+\.' "$rf" 2>/dev/null || true)
    if [ -z "$n" ] || [ "$n" -eq 0 ]; then
      note "no numbered rules found - ceiling not checked"
    elif [ "$n" -le "$DEF_RULES_MAX" ]; then
      ok "rules file within its ceiling ($n/$DEF_RULES_MAX)"
    else
      bad "$n rules, ceiling is $DEF_RULES_MAX - the ones at the bottom are decorative"
    fi
    return
  done
}

printf '\033[1m=== documentation checks ===\033[0m\n'

if [ $# -ge 1 ]; then
  for p in "$@"; do check_project "$(cd "$p" && pwd)"; done
else
  for parent in "$ROOT/myProjekts" "$ROOT/projects" "$ROOT"; do
    if [ ! -d "$parent" ]; then continue; fi
    while IFS= read -r p; do
      if [ -d "$p/docs" ]; then check_project "$p"; fi
    done < <(find "$parent" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
    if [ "$CHECKED" -gt 0 ]; then break; fi
  done
fi

check_rules

# Nothing checked is a failure, not a pass. The previous version printed
# a green "All checks passed" after looking at zero files - a result that
# means "I did not look" is the exact failure this method exists to stop.
if [ "$CHECKED" -eq 0 ]; then
  printf '\n\033[31mX no project with a docs/ directory was found - nothing was checked.\033[0m\n'
  printf '  Pass a project path explicitly, or run from the workspace root.\n'
  exit 2
fi

# Work that exists in exactly one copy, checked per repo.
# Skipped inside a pre-commit hook, where staged files are dirty by
# definition and the check would block every commit.
if [ "${VERIFY_SKIP_DIRTY:-0}" = "1" ]; then
  printf "
"
  if [ "$FAIL" = "0" ]; then
    printf "[32mAll checks passed (%d project(s)).[0m
" "$CHECKED"
  else
    printf "[31mSome checks failed - see above.[0m
"
  fi
  exit $FAIL
fi

printf '\n\033[1m-- not yet saved --\033[0m\n'
rm -f "$DIRTY_FLAG"
if [ -z "$REPOS" ]; then
  bad "no git repository found for any project - nothing is backed up"
else
  while IFS= read -r r; do
    if [ -z "$r" ]; then continue; fi
    u=$(git -C "$r" status --porcelain 2>/dev/null)
    if [ -z "$u" ]; then
      printf '  \033[32m/\033[0m %s - clean\n' "$(basename "$r")"
    else
      printf '  \033[31mX\033[0m %s - uncommitted, these exist in one copy only:\n' "$(basename "$r")"
      printf '%s\n' "$u" | sed 's/^/      /'
      printf 'DIRTY' > "$DIRTY_FLAG"
    fi
  done < <(printf '%s' "$REPOS" | tr '|' '\n' | grep -v '^$' | sort -u)
  if [ -f "$DIRTY_FLAG" ]; then FAIL=1; rm -f "$DIRTY_FLAG"; fi
fi

printf '\n'
if [ "$FAIL" = "0" ]; then
  printf '\033[32mAll checks passed (%d project(s)).\033[0m\n' "$CHECKED"
else
  printf '\033[31mSome checks failed - see above.\033[0m\n'
fi
exit $FAIL
