#!/usr/bin/env bash
# One time, by Yitzhak, in a server window (4/11): the keys the backup needs. He pastes them; secrets are not shown on
# screen and go only to /opt/expo-backup/env (root only). Each key is tried before it is kept. Then the passphrase is
# made (or kept, on a rerun), a copy goes to Supabase Vault, the first backup runs, and the cron is set.
# The prompts are in English on purpose: the terminal shows Hebrew left to right.
set -uo pipefail
cd /opt/expo-backup
umask 077
[ -s env ] && . ./env   # a rerun keeps what was given before, and the passphrase
. ./backup-lib.sh
WORK=$(mktemp -d /var/tmp/expomax-setup.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

clean() { local v=${1//$'\r'/}; v=${v#"${v%%[![:space:]]*}"}; printf '%s' "${v%"${v##*[![:space:]]}"}"; }
hidden() { local v; read -r -s -p "$1: " v; echo; printf -v "$2" '%s' "$(clean "$v")"; }
shown() { local v; read -r -p "$1: " v; printf -v "$2" '%s' "$(clean "$v")"; }
keep() { [ -n "${!1:-}" ] && { read -r -p "$2 is already set. Press Enter to keep it, or type n to replace it: " a; [ "$a" != n ]; }; }
# Each key is kept as soon as it works, so a window that closes halfway does not ask for it again.
save() { printf 'PGHOST=%q\nPGPASSWORD=%q\nSB_S3_ID=%q\nSB_S3_SECRET=%q\nR2_ID=%q\nR2_SECRET=%q\nPASSPHRASE=%q\n' \
           "${PGHOST:-}" "${PGPASSWORD:-}" "${SB_S3_ID:-}" "${SB_S3_SECRET:-}" "${R2_ID:-}" "${R2_SECRET:-}" "${PASSPHRASE:-}" \
           > env.new && mv env.new env; }
why() { grep -o '([A-Za-z]*)' <<<"$1" | head -1; }   # the service's reason, e.g. (SignatureDoesNotMatch); never a key

echo
echo "ExpoMax backup: one-time setup. Paste each key and press Enter. Secrets stay hidden while you paste."
echo

# 1. The database password (Supabase > Project Settings > Database).
if ! keep PGPASSWORD 'The database password'; then
  for try in 1 2 3; do
    hidden '1/5  Supabase database password' PGPASSWORD
    for PGHOST in aws-1-eu-central-1.pooler.supabase.com aws-0-eu-central-1.pooler.supabase.com; do
      pgpass; pg psql -At -c 'select 1' >/dev/null 2>&1 && break 2
    done
    echo "     That password did not work. Try again."; PGPASSWORD=
  done
  [ -n "$PGPASSWORD" ] || { echo "Stopped: the database password did not work."; exit 1; }
fi
pgpass; save; echo "     Database: OK"

# 2. Supabase Storage S3 (Storage > Settings > S3 Connection > New access key).
if ! keep SB_S3_ID 'The Supabase Storage key'; then
  for try in 1 2 3; do
    shown  '2/5  Supabase Storage: Access key ID' SB_S3_ID
    hidden '3/5  Supabase Storage: Secret access key' SB_S3_SECRET
    err=$(sb_s3 ls "s3://$(pg psql -At -c 'select id from storage.buckets order by 1 limit 1')" 2>&1 >/dev/null) && break
    echo "     Those Storage keys did not work $(why "$err"). Try again."; SB_S3_ID=
  done
  [ -n "$SB_S3_ID" ] || { echo "Stopped: the Storage keys did not work."; exit 1; }
fi
save; echo "     Storage: OK"

# 3. Cloudflare R2 (R2 > Manage API tokens > Create, Object Read & Write, bucket expomax-backups).
if ! keep R2_ID 'The R2 key'; then
  for try in 1 2 3; do
    shown  '4/5  Cloudflare R2: Access Key ID' R2_ID
    hidden '5/5  Cloudflare R2: Secret Access Key' R2_SECRET
    err=$(r2 ls "s3://$BUCKET" 2>&1 >/dev/null) && break
    echo "     Those R2 keys did not work $(why "$err"). Try again."; R2_ID=
  done
  [ -n "$R2_ID" ] || { echo "Stopped: the R2 keys did not work."; exit 1; }
fi
save; echo "     R2: OK"

# 4. The passphrase: made once, never shown. Its copy in Vault is what opens the R2 copies if this server is lost.
# On a new server it is taken back from Vault, so the old backups still open; only the very first run makes one.
if [ -z "${PASSPHRASE:-}" ]; then
  PASSPHRASE=$(pg psql -At -c "select decrypted_secret from vault.decrypted_secrets where name = 'expomax-backup-passphrase'")
  [ -n "$PASSPHRASE" ] || PASSPHRASE=$(openssl rand -base64 33 | tr -d '\n')
  save
fi
printf "select vault.create_secret('%s', 'expomax-backup-passphrase', 'ExpoMax backups: the gpg passphrase (also in /opt/expo-backup/env on the VPS)')
        where not exists (select 1 from vault.secrets where name = 'expomax-backup-passphrase');\n" "$PASSPHRASE" \
  | pg psql -q -At -v ON_ERROR_STOP=1 -f - >/dev/null || { echo "Stopped: could not keep the passphrase in Supabase Vault."; exit 1; }
echo "     Passphrase: ready, and a copy kept in Supabase Vault"

echo
echo "Running the first backup (about a minute)..."
if /opt/expo-backup/backup.sh >> /var/log/expomax-backup.log 2>&1; then
  printf '30 0,6,12,18 * * * root /opt/expo-backup/backup.sh >> /var/log/expomax-backup.log 2>&1\n' > /etc/cron.d/expomax-backup
  chmod 644 /etc/cron.d/expomax-backup
  echo "Done. The backup now runs every 6 hours by itself. You can close this window."
else
  echo "The keys are saved, but the first backup failed. Claude will look at it; you can close this window."
fi
