#!/usr/bin/env bash
# Puts the WhatsApp server on the VPS (the one with n8n), next to it, without touching anything else there:
# /opt/expo-wa holds the code and the linked accounts (data/, never in git), the container is capped at 1.5GB,
# and Traefik (Easypanel's) gets one file of its own, the same pattern as site-y-h-m.yml and supabase.yml.
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
scp -i "$KEY" -q package.json package-lock.json server.ts Dockerfile "$HOST:/opt/expo-wa/"
printf 'SUPABASE_URL=%s\nSUPABASE_KEY=%s\nSESSIONS_DIR=/data/sessions\n' "$VITE_SUPABASE_URL" "$VITE_SUPABASE_KEY" | ssh_run 'umask 077; cat > /opt/expo-wa/.env'
printf '# Written by expo-system/wa-server/deploy.sh\nhttp:\n  routers:\n    expo-wa:\n      rule: "Host(`%s`)"\n      entryPoints: [https]\n      service: expo-wa\n      tls:\n        certResolver: letsencrypt\n  services:\n    expo-wa:\n      loadBalancer:\n        servers:\n          - url: "http://expo-wa:8080"\n' "$DOMAIN" \
  | ssh_run 'cat > /etc/easypanel/traefik/config/expo-wa.yml'
ssh_run 'cd /opt/expo-wa && docker build -q -t expo-wa . >/dev/null && (docker rm -f expo-wa >/dev/null 2>&1 || true) &&
  docker run -d --name expo-wa --restart unless-stopped --network easypanel --memory 1500m --env-file .env -v /opt/expo-wa/data:/data expo-wa >/dev/null &&
  docker ps --filter name=expo-wa --format "{{.Names}} {{.Status}}"'
echo "https://$DOMAIN/health"
