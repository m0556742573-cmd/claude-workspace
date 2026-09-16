#!/usr/bin/env bash
# Builds the published book from its source, injecting the real scripts.
#
# The external review found that the code printed in the book was a manual
# copy of the files it described - the same fact in two places, which is
# the failure the book itself is about. It had already drifted: the book
# shipped the pre-fix checker while its own changelog said the bugs were
# fixed. Anyone copying from the "ready to use" toolkit would have got the
# bug back.
#
# So the scripts are no longer written into the book. A block marked
#   <div class="cb" data-src="path/to/file">
# has its <code> contents replaced with that file, escaped, at build time.
#
# Templates are NOT derived. They are generic examples that must not carry
# any project's content, so they stay hand-written - a deliberate
# exception, not an oversight.
#
#   bash כלים/build-book.sh
#
# Writes מתודולוגיה/ספר/ספר.html and exits non-zero if a source is missing.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/מתודולוגיה/ספר/ספר.src.html"
OUT="$ROOT/מתודולוגיה/ספר/ספר.html"

[ -f "$SRC" ] || { echo "source not found: $SRC"; exit 1; }

# Collect the referenced files first, so a missing one fails before any
# output is written rather than producing a half-built book.
missing=""
while IFS= read -r rel; do
  [ -f "$ROOT/$rel" ] || missing="$missing\n  $rel"
done < <(grep -oE 'data-src="[^"]+"' "$SRC" | sed 's/data-src="//; s/"$//')
if [ -n "$missing" ]; then
  printf 'build-book: sources referenced by the book do not exist:%b\n' "$missing"
  exit 1
fi

cp "$SRC" "$OUT"
count=0

while IFS= read -r rel; do
  # Escape for HTML, then for sed's replacement side.
  esc=$(sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' "$ROOT/$rel")
  tmp=$(mktemp)
  awk -v target="$rel" -v payload="$esc" '
    BEGIN { split(payload, lines, "\n") }
    {
      if ($0 ~ "data-src=\"" target "\"") { inblock = 1 }
      if (inblock && /<code>/) {
        print "<pre><code>"
        for (i = 1; i in lines; i++) print lines[i]
        print "</code></pre>"
        skipping = 1
        inblock = 0
        next
      }
      if (skipping) { if (/<\/code><\/pre>/) { skipping = 0 } ; next }
      print
    }
  ' "$OUT" > "$tmp" && mv "$tmp" "$OUT"
  count=$((count + 1))
  printf '  injected %s (%s lines)\n' "$rel" "$(wc -l < "$ROOT/$rel")"
done < <(grep -oE 'data-src="[^"]+"' "$SRC" | sed 's/data-src="//; s/"$//')

printf 'built %s from %d source file(s)\n' "${OUT#$ROOT/}" "$count"
