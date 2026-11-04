#!/usr/bin/env bash
# The backup (יצחק, 4/11: "תכין את הכל"), every 6 hours from cron once backup-setup.sh has the keys. It keeps what
# Supabase's free plan does not, and what lives only on this server:
#   main.dump          our schemas whole (public, ops, hq, the migration history): tables, rows, functions, policies
#   auth-storage.dump  the rows of auth (who can sign in) and storage (which file is where)
#   storage.tar.zst    the files themselves (logos, recordings), every bucket
#   wa.tar.zst         the WhatsApp sessions and this server's keys, so a new server needs no QR again
# Each part is encrypted (gpg, AES256) with the passphrase in /opt/expo-backup/env; a copy of the passphrase sits in
# Supabase Vault, so losing this server does not lose it. Kept here 7 days, and in R2 30 days. The outcome goes to
# /var/lib/expo-ops/backup.json, which report.sh puts on the status page. Nothing here prints a secret.
set -uo pipefail
exec 9>/var/lock/expomax-backup.lock
flock -n 9 || { echo "$(date -Is) already running"; exit 0; }
. /opt/expo-backup/env
. /opt/expo-backup/backup-lib.sh

ROOT=/var/backups/expomax
STAMP=$(TZ=Asia/Jerusalem date +%Y-%m-%d_%H%M)
DIR=$ROOT/$STAMP
WORK=$(mktemp -d /var/tmp/expomax-backup.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$ROOT" "$STATE" && chmod 700 "$ROOT"
WHEN=$(TZ=Asia/Jerusalem date '+%d/%m %H:%M')

fail() { state backup bad "נכשל ב-$WHEN: $1"; rm -rf "$DIR"; echo "$(date -Is) FAILED: $1"; exit 1; }

# 1. The database. Row counts first, so the drill can tell a restore that lost rows.
pgpass
sql=$(pg psql -At -c "$COUNT_SQL") || fail 'המסד לא עונה'
{ pg psql -At -F ' ' -c "$sql"
  pg psql -At -F ' ' -c "select 'auth.users', count(*) from auth.users union all select 'storage.objects', count(*) from storage.objects"
} > "$WORK/counts.txt" || fail 'ספירת השורות נכשלה'
pg pg_dump -Fc -n public -n ops -n hq -n supabase_migrations -f /w/main.dump || fail 'גיבוי המסד נכשל'
pg pg_dump -Fc --data-only -n auth -n storage --exclude-table=auth.schema_migrations --exclude-table=storage.migrations \
  -f /w/auth-storage.dump || fail 'גיבוי המשתמשים נכשל'
pg pg_restore --list /w/main.dump >/dev/null && pg pg_restore --list /w/auth-storage.dump >/dev/null || fail 'קובץ המסד לא נקרא'

# 2. The files in Storage, bucket by bucket.
mkdir -p "$WORK/storage"
for b in $(pg psql -At -c 'select id from storage.buckets order by 1'); do
  sb_s3 sync "s3://$b" "$WORK/storage/$b" --only-show-errors || fail "הורדת הקבצים מ-$b נכשלה"
done
files=$(find "$WORK/storage" -type f | wc -l)
objects=$(awk '$1=="storage.objects"{print $2}' "$WORK/counts.txt")
tar -C "$WORK" -cf - storage | zstd -q -T0 > "$WORK/storage.tar.zst" || fail 'אריזת הקבצים נכשלה'

# 3. The WhatsApp sessions and the server's keys. Files that change while read are fine: the next run catches them.
tar -C / --warning=no-file-changed --ignore-failed-read -cf - opt/expo-wa/data opt/expo-wa/.env opt/expo-wa/wa_key \
  opt/expo-ops/env 2>/dev/null | zstd -q -T0 > "$WORK/wa.tar.zst"
zstd -tq "$WORK/wa.tar.zst" || fail 'אריזת חיבורי הוואטסאפ נכשלה'

# 4. Encrypt, with sums, so the drill can tell a damaged copy.
mkdir -p "$DIR"
for f in main.dump auth-storage.dump storage.tar.zst wa.tar.zst; do
  enc "$WORK/$f" "$DIR/$f.gpg" || fail 'ההצפנה נכשלה'
done
cp "$WORK/counts.txt" "$DIR/"
( cd "$DIR" && sha256sum *.gpg > SHA256SUMS )

# 5. The copy away from this server.
offsite=0
if r2 cp "$DIR" "s3://$BUCKET/$STAMP/" --recursive --only-show-errors \
   && [ "$(r2 ls "s3://$BUCKET/$STAMP/" | wc -l)" -eq "$(ls "$DIR" | wc -l)" ]; then offsite=1; fi

# 6. Here, 7 days are enough; R2 keeps 30.
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +7 -exec rm -rf {} +

size=$(du -sh "$DIR" | cut -f1)
detail="$files קבצים מ-Storage"
[ "$files" = "$objects" ] || detail="$detail, אבל ב-Storage רשומים $objects"
if [ "$offsite" = 1 ]; then
  state backup ok "$WHEN · $size · בשרת וב-R2" "$detail"
else
  state backup warn "$WHEN · $size · רק בשרת: ההעלאה ל-R2 נכשלה" "$detail"
fi
echo "$(date -Is) done $STAMP $size offsite=$offsite files=$files/$objects"
