#!/usr/bin/env bash
# Proves the checker detects failures, instead of only confirming success.
#
# The method this repo follows says: do not trust a check you have not
# watched fail. This is that, automated.

set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
checker="$here/../verify-docs.sh"
fixture="$here/proj"
pass=0; fail=0

expect_fail() {
  local label="$1"; shift
  if VERIFY_SKIP_DIRTY=1 bash "$checker" "$@" >/dev/null 2>&1; then
    printf '  \033[31mX\033[0m %s - checker PASSED when it should have failed\n' "$label"
    fail=$((fail+1))
  else
    printf '  \033[32m/\033[0m %s - correctly detected\n' "$label"
    pass=$((pass+1))
  fi
}

printf '=== checker self-test ===\n'

# The fixture carries four planted defects at once: a doc missing from
# the index, a broken link, a status file over its ceiling, and an
# expiring-facts block dated in the distant past.
expect_fail "planted defects in fixture" "$fixture"

# And the failure mode that shipped for a week: checking nothing, and
# calling it success.
tmp=$(mktemp -d)
mkdir -p "$tmp/כלים" && cp "$checker" "$tmp/כלים/"
if (cd "$tmp" && bash כלים/verify-docs.sh >/dev/null 2>&1); then
  printf '  \033[31mX\033[0m empty workspace - reported success after checking nothing\n'
  fail=$((fail+1))
else
  printf '  \033[32m/\033[0m empty workspace - correctly refuses to pass\n'
  pass=$((pass+1))
fi
rm -rf "$tmp"

# The hook must fail when the checker is missing. Exiting 0 there is the
# same "green means I did not look" that was removed from the checker.
hookdir=$(mktemp -d)
mkdir -p "$hookdir/repo" && (cd "$hookdir/repo" && git init -q .)
cp "$here/../../.githooks/pre-commit" "$hookdir/repo/pc" 2>/dev/null
if [ -f "$hookdir/repo/pc" ]; then
  if (cd "$hookdir/repo" && bash pc >/dev/null 2>&1); then
    printf '  \033[31mX\033[0m missing checker - hook PASSED, should have blocked\n'
    fail=$((fail+1))
  else
    printf '  \033[32m/\033[0m missing checker - hook correctly blocks\n'
    pass=$((pass+1))
  fi
else
  printf '  \033[90m.\033[0m hook not found, skipped\n'
fi
rm -rf "$hookdir"

# Staged content must be what is checked, not the working tree. A file can
# be staged carrying an ID and then cleaned on disk; the commit would still
# contain it.
st=$(mktemp -d)
mkdir -p "$st/docs"
(cd "$st" && git init -q . && git config user.email t@t && git config user.name t && printf '# Index\n- [a](a.md)\n' > docs/INDEX.md \
  && printf '# A\n' > docs/a.md && git add -A && git commit -qm init 2>/dev/null \
  && printf '\nid 312847561\n' >> docs/a.md && git add docs/a.md \
  && printf '# A\n' > docs/a.md)
if VERIFY_SKIP_DIRTY=1 VERIFY_STAGED=1 bash "$checker" "$st" >/dev/null 2>&1; then
  printf '  \033[31mX\033[0m staged client data - PASSED, should have been caught\n'
  fail=$((fail+1))
else
  printf '  \033[32m/\033[0m staged client data - correctly caught in the index\n'
  pass=$((pass+1))
fi
rm -rf "$st"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
