#!/usr/bin/env bash
# Deploys site/ to the VPS as https://y-h-m.com.
#
# Same pattern that already serves supabase.y-h-m.com (Greenwald decision 0002):
# a plain container on the shared `easypanel` network, no published ports, and a
# Traefik file-provider entry next to supabase.yml. Traefik does TLS.
#
# Run it from your own machine (Git Bash on Windows works):
#   bash scripts/deploy.sh           deploy, or update the content
#   bash scripts/deploy.sh --check   read-only: report what is on the server, change nothing
#
# It touches only three things on the server, all named site-y-h-m:
#   /opt/site-y-h-m/html                                  the files
#   container site-y-h-m                                  nginx, read-only mount
#   /etc/easypanel/traefik/config/site-y-h-m.yml          the route
# Nothing of n8n, Easypanel or Supabase is changed.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

# The server address is NOT committed - it is the origin IP Cloudflare hides.
# Taken from scripts/.env.local (gitignored), or from the one Greenwald already has.
[ -f scripts/.env.local ] && . scripts/.env.local
GW_ENV="../גרינוואלד הנהלת חשבונות/supabase-selfhost/scripts/.env.local"
[ -f "$GW_ENV" ] && . "$GW_ENV"

SSH_KEY="${SITE_SSH_KEY:-${GREENWALD_SSH_KEY:-$HOME/.ssh/greenwald_vps}}"
SSH_HOST="${SITE_SSH_HOST:-${GREENWALD_SSH_HOST:-}}"
if [ -z "$SSH_HOST" ]; then
  printf 'No server address. Create scripts/.env.local with:\n  SITE_SSH_HOST=root@<server-ip>\n' >&2
  exit 2
fi

MODE="deploy"
[ "${1:-}" = "--check" ] && MODE="check"

if [ ! -f site/index.html ]; then
  printf 'site/index.html not found - nothing to deploy.\n' >&2
  exit 1
fi
if [ "$MODE" = "deploy" ] && grep -q '\[שם העסק\]' site/index.html; then
  printf '\033[33m! site/index.html still has placeholders ([שם העסק] ...). Deploying anyway.\033[0m\n'
fi

ssh_run() { ssh -i "$SSH_KEY" -o ConnectTimeout=20 "$SSH_HOST" "$@"; }

if [ "$MODE" = "deploy" ]; then
  printf '== uploading site/ ==\n'
  tar -C site -cf - . | ssh_run 'set -e
    mkdir -p /opt/site-y-h-m/html /opt/site-y-h-m/incoming
    rm -rf /opt/site-y-h-m/incoming/*
    tar -xf - -C /opt/site-y-h-m/incoming
    # In place, not a directory swap: the container bind-mounts this exact
    # directory, and a renamed one would keep serving the old copy.
    find /opt/site-y-h-m/html -mindepth 1 -delete
    cp -a /opt/site-y-h-m/incoming/. /opt/site-y-h-m/html/
    echo "  files on server: $(find /opt/site-y-h-m/html -type f | wc -l)"'
fi

printf '== server ==\n'
ssh_run "bash -s -- $MODE" <<'REMOTE'
set -euo pipefail
MODE="$1"
TCONF=/etc/easypanel/traefik/config
ROUTE="$TCONF/site-y-h-m.yml"
REF="$TCONF/supabase.yml"

ok()  { printf '  \033[32m/\033[0m %s\n' "$1"; }
bad() { printf '  \033[31mX\033[0m %s\n' "$1"; }

# Preflight: the working route is the reference. Copy its entry point and
# certificate resolver instead of guessing Easypanel's names.
if ! docker network inspect easypanel >/dev/null 2>&1; then bad "docker network 'easypanel' not found - stopping"; exit 1; fi
ok "network easypanel exists"
if [ ! -f "$REF" ]; then bad "$REF not found - the reference route is missing, stopping"; exit 1; fi
CR=$(grep -oE 'certResolver:[[:space:]]*"?[A-Za-z0-9_-]+' "$REF" | head -1 | sed -E 's/.*:[[:space:]]*"?//')
EP=$(awk '
  /entryPoints:/ {
    if (match($0, /\[.*\]/)) { s = substr($0, RSTART+1, RLENGTH-2); gsub(/[" ]/, "", s); print s; exit }
    f = 1; next
  }
  f && /^[[:space:]]*-/ { g = $0; gsub(/[-" \t]/, "", g); out = out (out ? "," : "") g; next }
  f { print out; f = 0; exit }
  END { if (f) print out }
' "$REF")
if [ -z "$CR" ] || [ -z "$EP" ]; then
  bad "could not read certResolver/entryPoints from supabase.yml - stopping. Its content:"
  sed 's/^/      /' "$REF"
  exit 1
fi
ok "copied from supabase.yml: entryPoints=[$EP] certResolver=$CR"

if [ "$MODE" = "deploy" ]; then
  if docker ps -a --format '{{.Names}}' | grep -qx site-y-h-m; then
    docker start site-y-h-m >/dev/null
    ok "container site-y-h-m already exists - content refreshed through the mount"
  else
    docker run -d --name site-y-h-m --restart unless-stopped \
      --network easypanel --memory 64m \
      -v /opt/site-y-h-m/html:/usr/share/nginx/html:ro \
      nginx:1.27-alpine >/dev/null
    ok "container site-y-h-m created (no published ports)"
  fi

  NEW=$(mktemp)
  cat > "$NEW" <<YAML
# Written by myProjekts/אתר y-h-m/scripts/deploy.sh - same pattern as supabase.yml.
http:
  routers:
    site-y-h-m:
      rule: "Host(\`y-h-m.com\`) || Host(\`www.y-h-m.com\`)"
      entryPoints: [$EP]
      service: site-y-h-m
      tls:
        certResolver: $CR
  services:
    site-y-h-m:
      loadBalancer:
        servers:
          - url: "http://site-y-h-m:80"
YAML
  if [ -f "$ROUTE" ] && cmp -s "$NEW" "$ROUTE"; then
    ok "route unchanged"
  else
    [ -f "$ROUTE" ] && cp "$ROUTE" "/opt/site-y-h-m/site-y-h-m.yml.bak.$(date +%Y%m%d%H%M%S)"
    cp "$NEW" "$ROUTE"
    ok "route written: $ROUTE"
  fi
  rm -f "$NEW"
  sleep 3
fi

# Report what is there, in both modes.
if docker ps --format '{{.Names}}' | grep -qx site-y-h-m; then ok "container running"; else bad "container not running"; fi
if [ -f "$ROUTE" ]; then ok "route file present"; else bad "route file missing"; fi
CODE=$(curl -sk -o /dev/null -w '%{http_code}' --resolve y-h-m.com:443:127.0.0.1 https://y-h-m.com/ || true)
if [ "$CODE" = "200" ]; then ok "Traefik serves y-h-m.com locally (HTTP $CODE)"; else bad "Traefik answered HTTP $CODE for y-h-m.com"; fi
REMOTE

printf '== from the internet ==\n'
for u in https://y-h-m.com/ https://www.y-h-m.com/; do
  # --ssl-no-revoke: Windows curl (schannel) otherwise fails with 000 when it cannot
  # reach the revocation list, though the site is fine. Other curl builds ignore it.
  code=$(curl -s --ssl-no-revoke -o /dev/null -w '%{http_code}' --max-time 15 "$u" || true)
  printf '  %s -> HTTP %s\n' "$u" "${code:-no answer}"
done
printf '  (no answer or 52x right after the first deploy: check the DNS records, and wait a minute for the certificate)\n'
