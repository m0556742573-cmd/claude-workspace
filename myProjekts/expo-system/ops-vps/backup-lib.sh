#!/usr/bin/env bash
# Shared by backup.sh, backup-setup.sh and backup-drill.sh (sourced, after /opt/expo-backup/env). Every tool runs so
# that no secret lands on a command line: the database password goes through a pgpass file in $WORK (root only), the
# S3 keys through the environment of one aws call, the passphrase through a file descriptor.
REF=fooofbweajfpiedfwilw
R2_URL=https://bab64a51fa322ec341fcba14de231656.r2.cloudflarestorage.com
BUCKET=expomax-backups   # made 4/11 in his Cloudflare account; R2 deletes what is older than 30 days (rule expire-30d)
PG_IMAGE=postgres:17-alpine
STATE=/var/lib/expo-ops  # report.sh reads backup.json and drill.json from here
export AWS_CONFIG_FILE=/opt/expo-backup/aws.cfg   # path-style addressing, which Supabase's S3 needs. No --profile:
                                                  # a named profile makes aws ignore the keys given in the environment

# The free plan's database answers only on IPv6 directly, so we go through Supabase's session pooler (IPv4).
pgpass() {
  local p=${PGPASSWORD//\\/\\\\}; p=${p//:/\\:}
  ( umask 077; printf '%s:5432:postgres:postgres.%s:%s\n' "$PGHOST" "$REF" "$p" > "$WORK/.pgpass" )
}
pg() {
  docker run --rm -i --network host -v "$WORK:/w" -e PGPASSFILE=/w/.pgpass -e PGSSLMODE=require \
    -e PGHOST="$PGHOST" -e PGPORT=5432 -e PGUSER="postgres.$REF" -e PGDATABASE=postgres "$PG_IMAGE" "$@"
}

sb_s3() { AWS_ACCESS_KEY_ID="$SB_S3_ID" AWS_SECRET_ACCESS_KEY="$SB_S3_SECRET" aws --region eu-central-1 \
            --endpoint-url "https://$REF.storage.supabase.co/storage/v1/s3" s3 "$@"; }
r2() { AWS_ACCESS_KEY_ID="$R2_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET" aws --region auto \
         --endpoint-url "$R2_URL" s3 "$@"; }

GPG=(gpg --batch --yes --quiet --no-symkey-cache --pinentry-mode loopback --passphrase-fd 3)
enc() { "${GPG[@]}" --symmetric --cipher-algo AES256 --compress-algo none -o "$2" "$1" 3<<<"$PASSPHRASE"; }
dec() { "${GPG[@]}" --decrypt -o "$2" "$1" 3<<<"$PASSPHRASE"; }

# Rows in every table of our schemas, plus the users and the stored files, as "schema.table count" lines.
COUNT_SQL="select string_agg(format('select %L, count(*) from %I.%I', n.nspname || '.' || c.relname, n.nspname, c.relname),
  ' union all ' order by n.nspname, c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and not c.relispartition and n.nspname in ('public', 'ops', 'hq')"

# The result for the status page: level, a short Hebrew value, and a detail.
state() { python3 -c 'import json,sys; print(json.dumps(dict(zip(["at","level","value","detail"], sys.argv[1:])), ensure_ascii=False))' \
            "$(date -Is)" "$2" "$3" "${4:-}" > "$STATE/$1.json"; }
