#!/usr/bin/env bash
# Consistency check: the live DB against the repo, and the DB against its own rules.
#
# Closes finding 18 of the 31/08/2026 audit — documentation and schema were two
# competing sources of truth with nothing checking they agreed. Findings 1 and 7
# of that audit (13 tables without RLS in code, two dead updated_at columns) would
# both have been caught by this on the day they were introduced.
#
# Run from the project root, at the end of every entity group and before any commit
# that touched the schema:
#   bash supabase-selfhost/scripts/verify.sh
#
# Exits non-zero if any check fails, so it can be wired into CI later.

set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

# The server address is NOT committed. It comes from the environment, or from
# scripts/.env.local (gitignored). Hardcoding it would publish the origin IP
# that Cloudflare exists to hide — and this repo is backed up to GitHub.
[ -f supabase-selfhost/scripts/.env.local ] && . supabase-selfhost/scripts/.env.local

SSH_KEY="${GREENWALD_SSH_KEY:-$HOME/.ssh/greenwald_vps}"
SSH_HOST="${GREENWALD_SSH_HOST:-}"
if [ -z "$SSH_HOST" ]; then
  printf 'GREENWALD_SSH_HOST is not set.\n' >&2
  printf 'Set it in the environment, or create supabase-selfhost/scripts/.env.local with:\n' >&2
  printf '  GREENWALD_SSH_HOST=root@<server-ip>\n' >&2
  exit 2
fi
FAIL=0

psql_q() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=20 "$SSH_HOST" \
    "docker exec supabase-db psql -U postgres -d postgres -tAc \"$1\"" 2>/dev/null | tr -d '\r'
}

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }
# A note never fails the run. Some findings are legitimately ambiguous -- a client
# with no obligations may be correct (consulting only) or may be a data hole, and
# only a person can tell which. Reporting those as failures would train everyone
# to ignore the output.
note() { printf '  \033[33m•\033[0m %s\n' "$1"; }

echo "── DB invariants ──"

n=$(psql_q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;")
[ "$n" = "0" ] && ok "every table has RLS enabled" || bad "$n table(s) without RLS"

# Views are excluded on purpose: they inherit updated_at from their base table
# and cannot carry triggers, so they would be a permanent false positive.
n=$(psql_q "select count(*) from information_schema.columns col join pg_class c on c.relname=col.table_name join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where col.table_schema='public' and col.column_name='updated_at' and c.relkind='r' and not exists (select 1 from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal and t.tgname like '%updated_at%');")
[ "$n" = "0" ] && ok "every updated_at column has its trigger" || bad "$n dead updated_at column(s)"

n=$(psql_q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' and (c.reloptions is null or not ('security_invoker=true' = any(c.reloptions)));")
[ "$n" = "0" ] && ok "every view sets security_invoker" || bad "$n view(s) without security_invoker — RLS bypass risk"

# select * is frozen at view creation, so a column added to clients silently
# fails to appear in active_clients. See entities/active_clients.md.
a=$(psql_q "select count(*) from information_schema.columns where table_schema='public' and table_name='clients';")
b=$(psql_q "select count(*) from information_schema.columns where table_schema='public' and table_name='active_clients';")
[ "$a" = "$b" ] && ok "active_clients is in sync with clients ($a columns)" \
  || bad "active_clients is stale: clients has $a columns, the view has $b — run create or replace view"

# A dead exclude: an override that removes an obligation the chain never produced
# for that client. It excludes nothing and hides its own intent -- somebody
# recorded "this client does not owe X" and the system has no X to remove, so the
# day the deal changes and X does appear, the row silently starts biting.
# Only applies=false qualifies. applies=true on a template outside the chain is
# the include direction working exactly as designed.
n=$(psql_q "select count(*) from client_obligation_overrides o where o.applies = false and not exists (select 1 from deals d join deal_services ds on ds.deal_id=d.id join service_obligation_templates sot on sot.service_id=ds.service_id where d.client_id=o.client_id and d.closed_at is null and sot.obligation_template_id=o.obligation_template_id);")
[ "$n" = "0" ] && ok "no override excludes an obligation the chain never produced" \
  || bad "$n dead exclude(s) — an override removing something the client does not derive"

# Active clients whose resolved obligation list is empty. This is the silent hole
# behind goal 1: a client who owes VAT but was never given a bookkeeping service
# never appears in any list -- not late, simply absent. It cannot be a failure,
# because consulting-only clients legitimately owe nothing.
empty=$(psql_q "select string_agg(c.legal_name, ', ') from clients c join client_statuses s on s.id=c.status_id where c.deleted_at is null and s.code='active' and not exists (select 1 from client_obligations_current v where v.client_id=c.id);")
[ -z "$empty" ] && ok "every active client resolves to at least one obligation" \
  || note "active clients with no obligations at all — correct, or a missing service: $empty"

# Running the generators is the automation layer's job. Noticing that they did not
# run is this one's: an automation that silently stops looks exactly like an
# automation with nothing to do, and the cost of not noticing is that obligations
# stop appearing without an error -- the goal 1 failure one level up.
# The horizon is declared in office_settings, not hardcoded here.
# Compared against the last period that ENDS inside the horizon, not against the
# horizon date itself. Obligations are produced per period, so a period straddling
# the boundary is legitimately absent -- comparing to the raw date reports a gap
# that is not one, and a check that cries wolf is a check people turn off.
short=$(psql_q "with h as (select (current_date + (generation_horizon_months || ' months')::interval)::date as target from office_settings), e as (select max(p.end_date) as expected from periods p where p.end_date <= (select target from h)) select string_agg(layer || ' reaches ' || reach || ', needs ' || (select expected from e)::text, '; ') from (select 'calendar' as layer, max(p.end_date) as reach from regulatory_calendar rc join periods p on p.id=rc.period_id union all select 'obligations', max(p.end_date) from obligations o join regulatory_calendar rc on rc.id=o.regulatory_calendar_id join periods p on p.id=rc.period_id) t where reach < (select expected from e);")
[ -z "$short" ] && ok "calendar and obligations cover the declared horizon" \
  || bad "a generated layer is running out — the automation has not run: $short"

# Reminders are checked by coverage rather than by reach: their dates lag the
# deadlines they announce, so "how far do they stretch" answers the wrong question.
# What matters is whether any open obligation inside the horizon has none.
nored=$(psql_q "with h as (select (current_date + (generation_horizon_months || ' months')::interval)::date as target from office_settings) select count(*) from obligations o join obligation_statuses os on os.id=o.status_id join regulatory_calendar rc on rc.id=o.regulatory_calendar_id where not os.is_closed and rc.effective_due_date between current_date and (select target from h) and not exists (select 1 from reminders r where r.obligation_id = o.id);")
[ "$nored" = "0" ] && ok "every open obligation inside the horizon has a reminder" \
  || bad "$nored open obligation(s) inside the horizon have no reminder"

# Frequency is resolved in TWO places: client_obligations_at, and the used-pairs
# CTE inside generate_regulatory_calendar. They must agree. When they did not --
# on 15/09, over the anchor-inherited cadence -- a client's obligations vanished
# silently rather than erroring. Nothing was checking, so nothing said so.
mismatch=$(psql_q "select string_agg(distinct v.client_name || ' / ' || v.obligation_name || ' (' || v.reporting_frequency || ')', '; ') from client_obligations_current v where not exists (select 1 from regulatory_calendar rc join periods p on p.id = rc.period_id where rc.obligation_template_id = v.obligation_template_id and p.reporting_frequency_id = v.reporting_frequency_id);")
[ -z "$mismatch" ] && ok "every resolved cadence has calendar entries to hang off" \
  || bad "the view and the calendar disagree on cadence — these resolve to a frequency the calendar never generated: $mismatch"

echo
echo "── repo against DB ──"

psql_q "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v') order by 1;" | sort > /tmp/_gw_db.txt
ls docs/entities/*.md 2>/dev/null | sed 's#.*/##; s#\.md$##' | grep -v '^INDEX$' | sort > /tmp/_gw_docs.txt

miss=$(comm -23 /tmp/_gw_db.txt /tmp/_gw_docs.txt)
[ -z "$miss" ] && ok "every DB object has an entity doc" \
  || { bad "DB objects with no doc:"; echo "$miss" | sed 's/^/      /'; }

# A doc with no DB object is legitimate while an entity is characterized but not
# yet built — that is the project's workflow, characterization always precedes SQL.
# So this only fails when entities/INDEX.md claims the object is "בקוד" (in code)
# and it is not actually there. Docs marked 📝 מאופיין are expected to have no object.
unbuilt=""
for name in $(comm -13 /tmp/_gw_db.txt /tmp/_gw_docs.txt); do
  row=$(grep -F "($name.md)" docs/entities/INDEX.md | head -1)
  if echo "$row" | grep -q 'בקוד'; then
    unbuilt="$unbuilt\n      $name — INDEX says it is in code, but it is not in the DB"
  elif [ -z "$row" ]; then
    unbuilt="$unbuilt\n      $name — not listed in entities/INDEX.md at all"
  fi
done
[ -z "$unbuilt" ] && ok "no entity doc contradicts the DB (characterized-but-unbuilt is fine)" \
  || { bad "docs out of step with the DB:"; printf "$unbuilt\n"; }

# The header of entities/INDEX.md still claimed 37 tables while the file itself
# listed 42 -- it drifted when the deal model and the obligation templates landed.
# None of the checks above catch it: they verify that every object has a doc and
# every doc has an object, never that the stated total is right. Extracted with an
# ASCII-only pattern (the line begins "**42 טבלאות") so the Hebrew stays out of the
# shell quoting.
claimed=$(grep -oE '^\*\*[0-9]+' docs/entities/INDEX.md | head -1 | tr -d '*')
actual=$(psql_q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';")
[ "$claimed" = "$actual" ] && ok "entities/INDEX.md states the right table count ($actual)" \
  || bad "entities/INDEX.md claims $claimed tables, the DB has $actual"

echo
echo "── repo internal consistency ──"

for dir_pat in "supabase-selfhost/migrations:*.sql:migrations" "supabase-selfhost/seeds:*.sql:seeds" "docs/decisions:*.md:ADRs"; do
  d="${dir_pat%%:*}"; rest="${dir_pat#*:}"; pat="${rest%%:*}"; label="${rest#*:}"
  undoc=""
  for f in $(ls $d/$pat 2>/dev/null | sed 's#.*/##'); do
    grep -qF "$f" docs/INDEX.md || undoc="$undoc $f"
  done
  [ -z "$undoc" ] && ok "all $label are listed in docs/INDEX.md" \
    || bad "$label missing from docs/INDEX.md:$undoc"
done

broken=""
for f in $(find docs -name '*.md'); do
  d=$(dirname "$f")
  for l in $(grep -oE '\]\([^)#][^)]*\.md\)' "$f" 2>/dev/null | sed 's/^](//; s/)$//'); do
    [ -f "$d/$l" ] || broken="$broken\n      $f → $l"
  done
done
[ -z "$broken" ] && ok "no broken internal doc links" \
  || { bad "broken links:"; printf "$broken\n"; }

echo
[ "$FAIL" = "0" ] && printf '\033[32mAll checks passed.\033[0m\n' || printf '\033[31mSome checks failed — see above.\033[0m\n'
exit $FAIL
