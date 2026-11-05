#!/usr/bin/env bash
# The restore drill (before 11/11, then monthly): it proves the backup can be read back, without touching anything
# live. It takes the newest backup from R2, not from this server, so it also proves the copy away from here and the
# passphrase; checks the sums; decrypts; restores main.dump into a throwaway Postgres and compares every table's rows
# with the counts taken at backup time; counts the users and the files; and checks that each WhatsApp session has its
# creds.json. The outcome goes to /var/lib/expo-ops/drill.json, and from there to the status page.
#
# A real restore (Supabase lost or damaged) follows the same order as the drill, into a new or reset project, with psql.
# The users go in FIRST: our tables point at them (exhibitors.owner), and a link to a missing user stops the restore
# (the first drill, 5/11, showed it). A new project already has the schema public, so its CREATE is left out:
#   pg_restore --data-only -f auth-storage.sql auth-storage.dump
#   psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c 'set session_replication_role = replica' -f auth-storage.sql
#   pg_restore -l main.dump | grep -v -e ' SCHEMA - public ' -e ' COMMENT - SCHEMA public ' > main.list
#   pg_restore --no-owner -L main.list -f main.sql main.dump
#   psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f main.sql
#   then the files: aws s3 sync each folder of storage/ back to its bucket. WhatsApp: untar wa.tar.zst at / on the
#   new server before deploy.sh, and the exhibitors stay linked.
set -uo pipefail
. /opt/expo-backup/env
. /opt/expo-backup/backup-lib.sh
WORK=$(mktemp -d /var/tmp/expomax-drill.XXXXXX)
DB=expomax-drill-$$
trap 'docker rm -f "$DB" >/dev/null 2>&1; rm -rf "$WORK"' EXIT
WHEN=$(TZ=Asia/Jerusalem date '+%d/%m %H:%M')
fail() { state drill bad "נכשל ב-$WHEN: $1"; echo "DRILL FAILED: $1"; exit 1; }

STAMP=$(r2 ls "s3://$BUCKET/" | awk '$1=="PRE"{print $2}' | sort | tail -1 | tr -d /)
[ -n "$STAMP" ] || fail 'אין גיבוי ב-R2'
echo "Drill on $STAMP, from R2"
r2 cp "s3://$BUCKET/$STAMP/" "$WORK/in/" --recursive --only-show-errors || fail 'ההורדה מ-R2 נכשלה'
( cd "$WORK/in" && sha256sum -c --quiet SHA256SUMS ) || fail 'עותק פגום: הסכום לא תואם'
for f in "$WORK"/in/*.gpg; do dec "$f" "$WORK/$(basename "$f" .gpg)" || fail 'הפענוח נכשל'; done

# A throwaway Postgres, with just enough of Supabase (roles, auth functions, extensions) for our schemas to load.
docker run -d --name "$DB" -e POSTGRES_PASSWORD=drill -v "$WORK:/w" "$PG_IMAGE" >/dev/null || fail 'Postgres לניסוי לא עלה'
for i in $(seq 60); do docker exec "$DB" pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || fail 'הכנת Postgres לניסוי נכשלה'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role authenticator nologin; create role supabase_admin nologin; create role supabase_auth_admin nologin;
create role supabase_storage_admin nologin; create role dashboard_user nologin;
create schema auth; create schema extensions; create schema storage; create schema vault;
create extension pgcrypto schema extensions; create extension "uuid-ossp" schema extensions; create extension pg_trgm schema extensions;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
create function auth.role() returns text language sql stable as 'select null::text';
create function auth.email() returns text language sql stable as 'select null::text';
create function auth.jwt() returns jsonb language sql stable as 'select null::jsonb';
SQL
# The users first, as in a real restore: here only their ids, which is what our tables point at.
docker exec "$DB" pg_restore --data-only -f /w/auth-storage.sql /w/auth-storage.dump || fail 'קובץ המשתמשים לא נקרא'
awk -F'\t' '/^COPY auth\.users /{h=$0; sub(/^[^(]*\(/, "", h); sub(/\).*$/, "", h); n=split(h, c, ", ");
              for (i = 1; i <= n; i++) if (c[i] == "id") k = i; on = 1; next}
            on && /^\\\.$/{on = 0} on && k {print $k}' "$WORK/auth-storage.sql" > "$WORK/user-ids.txt"
docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 -c 'copy auth.users (id) from stdin' < "$WORK/user-ids.txt" \
  || fail 'המשתמשים לא נטענו לניסוי'
# Then our schemas, without the CREATE of public, which a new project already has.
docker exec "$DB" sh -c "pg_restore -l /w/main.dump | grep -v -e ' SCHEMA - public ' -e ' COMMENT - SCHEMA public ' > /w/main.list"
docker exec "$DB" pg_restore -U postgres -d postgres --no-owner -L /w/main.list /w/main.dump > "$WORK/restore.log" 2>&1
errors=$(grep -c 'error:' "$WORK/restore.log")
first_error=$(grep -m1 -A1 'ERROR:' "$WORK/restore.log" | sed -n 's/.*ERROR: *//p' | head -1 | cut -c1-160)

# Every table must have at least the rows counted at backup time (the counts come a moment before the dump).
sql=$(docker exec "$DB" psql -U postgres -At -c "$COUNT_SQL")
docker exec "$DB" psql -U postgres -At -F ' ' -c "$sql" > "$WORK/restored.txt"
short=$(awk 'NR==FNR{got[$1]=$2; next} $1 ~ /^(public|ops|hq)\./ && (got[$1]+0) < $2 {print $1" "got[$1]+0"/"$2}' \
          "$WORK/restored.txt" "$WORK/in/counts.txt")
tables=$(wc -l < "$WORK/restored.txt")
rows=$(awk '{s+=$2} END{print s+0}' "$WORK/restored.txt")

# The users and the file records, counted inside auth-storage.dump.
users=$(awk '/^COPY auth\.users /{on=1; next} on && /^\\\.$/{on=0} on{n++} END{print n+0}' "$WORK/auth-storage.sql")
want_users=$(awk '$1=="auth.users"{print $2}' "$WORK/in/counts.txt")
files=$(zstd -dc "$WORK/storage.tar.zst" | tar -tf - | grep -vc '/$')
want_files=$(awk '$1=="storage.objects"{print $2}' "$WORK/in/counts.txt")
sessions=$(zstd -dc "$WORK/wa.tar.zst" | tar -tf - | grep -c '^opt/expo-wa/data/sessions/[^/]*/creds\.json$')

summary="$tables טבלאות, $rows שורות · $users/$want_users משתמשים · $files/$want_files קבצים · $sessions חיבורי וואטסאפ"
echo "$summary · restore errors: $errors"
if [ -n "$short" ] || [ "$users" -lt "${want_users:-0}" ]; then
  fail "חסרות שורות: ${short:-משתמשים} · $summary"
fi
# A real restore stops at the first error, so the drill does not pass with any.
[ "$errors" -eq 0 ] || fail "$errors שגיאות בשחזור, הראשונה: $first_error"
state drill ok "$WHEN, מגיבוי $STAMP" "$summary"
echo "Drill OK"
