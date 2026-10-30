#!/usr/bin/env bash
# Puts the WhatsApp server on the VPS (the one with n8n), next to it, without touching anything else there:
# /opt/expo-wa holds the code and the linked accounts (data/, never in git), the container is capped at 4.5GB (30/10: room for the linked accounts),
# and Traefik (Easypanel's) gets one file of its own, the same pattern as site-y-h-m.yml and supabase.yml.
# The old container is stopped, not killed: it gets 20 seconds to close each account's connection (SIGTERM in server.ts).
# Needs: WA_SSH_HOST=root@<server-ip> in wa-server/.env.local, the key ~/.ssh/greenwald_vps, and ../app/.env for the Supabase address.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env.local ] && . ./.env.local
HOST="${WA_SSH_HOST:-${GREENWALD_SSH_HOST:-}}"
KEY="${WA_SSH_KEY:-$HOME/.ssh/greenwald_vps}"
DOMAIN="${WA_DOMAIN:-expo-wa.paydfb.easypanel.host}"
[ -n "$HOST" ] || { echo "No server address. Create wa-server/.env.local with WA_SSH_HOST=root@<server-ip>"; exit 1; }
set -a; . ../app/.env; set +a
ssh_run() { ssh -i "$KEY" -o ConnectTimeout=20 -o BatchMode=yes "$HOST" "$@"; }

ssh_run 'mkdir -p /opt/expo-wa/data && chmod 700 /opt/expo-wa/data'
# The build folder mirrors the repo: the server, and beside it the engine and the approved texts its planner uses.
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/wa-server" "$STAGE/engine" "$STAGE/consultant-rounds"
cp package.json package-lock.json Dockerfile .dockerignore "$STAGE/"
cp server.ts limits.ts planner.ts mail.ts "$STAGE/wa-server/"
cp -r ../engine/src ../engine/fixtures "$STAGE/engine/"
cp ../consultant-rounds/messages-approved.json "$STAGE/consultant-rounds/"
ssh_run 'cd /opt/expo-wa && rm -rf wa-server engine consultant-rounds server.ts limits.ts'
scp -i "$KEY" -q -r "$STAGE"/. "$HOST:/opt/expo-wa/"
printf 'SUPABASE_URL=%s\nSUPABASE_KEY=%s\nSESSIONS_DIR=/data/sessions\n' "$VITE_SUPABASE_URL" "$VITE_SUPABASE_KEY" | ssh_run 'umask 077; cat > /opt/expo-wa/.env'
# The server's own key for the send queue: made once on the server, never copied out; only its hash goes to the database.
ssh_run '[ -s /opt/expo-wa/wa_key ] || (umask 077; openssl rand -hex 32 | tr -d "\n" > /opt/expo-wa/wa_key); echo "wa_key sha256: $(sha256sum < /opt/expo-wa/wa_key | cut -d" " -f1)"'
printf '# Written by expo-system/wa-server/deploy.sh\nhttp:\n  routers:\n    expo-wa:\n      rule: "Host(`%s`)"\n      entryPoints: [https]\n      service: expo-wa\n      tls:\n        certResolver: letsencrypt\n  services:\n    expo-wa:\n      loadBalancer:\n        servers:\n          - url: "http://expo-wa:8080"\n' "$DOMAIN" \
  | ssh_run 'cat > /etc/easypanel/traefik/config/expo-wa.yml'
ssh_run 'cd /opt/expo-wa && docker build -q -t expo-wa . >/dev/null && (docker stop -t 20 expo-wa >/dev/null 2>&1; docker rm -f expo-wa >/dev/null 2>&1 || true) &&
  docker run -d --name expo-wa --restart unless-stopped --network easypanel --memory 4500m --env-file .env -e WA_KEY="$(cat wa_key)" -v /opt/expo-wa/data:/data expo-wa >/dev/null &&
  docker ps --filter name=expo-wa --format "{{.Names}} {{.Status}}"'
echo "https://$DOMAIN/health"
