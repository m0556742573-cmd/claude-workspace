#!/usr/bin/env bash
# Puts the server's report and watchdog on the VPS (run from this folder, after his "תעלה"). Makes the server's own
# key on the server, keeps it there (root only), and prints only its sha256, which goes into ops.settings as
# 'reporter:server'. The publishable Supabase key comes from /opt/expo-wa/.env, where deploy.sh already put it.
set -euo pipefail
cd "$(dirname "$0")"
. ../wa-server/.env.local
HOST="${WA_SSH_HOST:-${GREENWALD_SSH_HOST:-}}"; KEY="${WA_SSH_KEY:-$HOME/.ssh/greenwald_vps}"
ssh_run() { ssh -i "$KEY" -o BatchMode=yes "$HOST" "$@"; }
ssh_run 'mkdir -p /opt/expo-ops && chmod 700 /opt/expo-ops'
scp -i "$KEY" -q report.sh watchdog.sh "$HOST:/opt/expo-ops/"
ssh_run 'set -e; cd /opt/expo-ops; chmod 700 report.sh watchdog.sh
  if [ ! -s env ]; then
    umask 077
    . /opt/expo-wa/.env
    printf "SUPABASE_URL=%s\nSUPABASE_KEY=%s\nOPS_KEY=%s\n" "$SUPABASE_URL" "$SUPABASE_KEY" "$(openssl rand -hex 32)" > env
  fi
  . ./env; echo "reporter:server sha256: $(printf %s "$OPS_KEY" | sha256sum | cut -d" " -f1)"
  printf "* * * * * root /opt/expo-ops/watchdog.sh\n*/5 * * * * root /opt/expo-ops/report.sh\n" > /etc/cron.d/expo-ops
  chmod 644 /etc/cron.d/expo-ops'
