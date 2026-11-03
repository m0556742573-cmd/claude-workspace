#!/usr/bin/env bash
# The watchdog (3/11: "כל דבר אוטומטי לחלוטין ללא התערבות שלי"), every minute from cron. Docker already restarts the
# WhatsApp server when it crashes; this catches the case Docker cannot see: the process is alive but does not answer.
# It asks the server itself, inside its container (not through Traefik, so a Traefik problem does not restart it).
# After 3 failures in a row it restarts the container (20 seconds to close the WhatsApp connections cleanly, as in
# deploy.sh) and writes the time down; report.sh shows it on the status page and the watcher mails it.
set -uo pipefail
STATE=/var/lib/expo-ops; mkdir -p "$STATE"
FAILS="$STATE/fails"

if docker exec expo-wa node -e "fetch('http://127.0.0.1:8080/health',{signal:AbortSignal.timeout(8000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  echo 0 > "$FAILS"
  exit 0
fi

n=$(( $(cat "$FAILS" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAILS"
if [ "$n" -ge 3 ]; then
  docker restart -t 20 expo-wa >/dev/null 2>&1
  echo 0 > "$FAILS"
  echo "הופעל מחדש $(TZ=Asia/Jerusalem date '+%d/%m %H:%M')" > "$STATE/restarts"
  logger -t expo-ops "watchdog restarted expo-wa after 3 failed health checks"
fi
