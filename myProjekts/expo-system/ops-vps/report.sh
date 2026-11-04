#!/usr/bin/env bash
# The server's own report (יצחק, 3/11: "תעקוב גם על הביצועים של השרת שלי"), every 5 minutes from cron: memory, disk,
# load, the containers that must run, the WhatsApp server's memory and accounts, and whether a reboot is waiting.
# Written to the admin's status page through ops_report (migration 0046) with this server's own key, which sits in
# /opt/expo-ops/env (root only) and only as a sha256 in the database. Nothing here prints or sends a secret.
set -uo pipefail
. /opt/expo-ops/env   # SUPABASE_URL, SUPABASE_KEY (publishable), OPS_KEY
STATE=/var/lib/expo-ops; mkdir -p "$STATE"

python3 - "$STATE" <<'PY' > "$STATE/report.json"
import json, os, shutil, subprocess, sys
state = sys.argv[1]
def sh(cmd):
    try: return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception: return ''
checks = []
def add(key, label, level, value, detail=None, platform='vps'):
    checks.append({'key': key, 'platform': platform, 'label': label, 'level': level, 'value': value, 'detail': detail})

mem = {l.split(':')[0]: int(l.split()[1]) for l in open('/proc/meminfo') if l.split()[0].rstrip(':') in ('MemTotal', 'MemAvailable')}
avail, total = mem['MemAvailable'] // 1024, mem['MemTotal'] // 1024
add('vps.memory', 'זיכרון פנוי', 'bad' if avail < 400 else 'warn' if avail < 1000 else 'ok', f'{avail}MB מתוך {total}MB')

du = shutil.disk_usage('/')
pct = round(du.used * 100 / du.total)
add('vps.disk', 'דיסק', 'bad' if pct >= 90 else 'warn' if pct >= 80 else 'ok', f'{pct}% בשימוש · {du.free // 2**30}GB פנויים')

cores = os.cpu_count() or 1
load5 = os.getloadavg()[1]
add('vps.load', 'עומס', 'bad' if load5 > 2 * cores else 'warn' if load5 > cores else 'ok', f'{load5:.2f} ({cores} ליבות)')

running = sh("docker ps --format '{{.Names}}'").splitlines()
must = {'expo-wa': 'שרת הוואטסאפ', 'easypanel-traefik': 'Traefik (הכתובות)', 'site-y-h-m': 'האתר', 'my-apps_n8n': 'n8n'}
missing = [label for name, label in must.items() if not any(r == name or r.startswith(name + '.') for r in running)]
add('vps.containers', 'מה רץ בשרת', 'bad' if 'שרת הוואטסאפ' in missing or 'Traefik (הכתובות)' in missing else 'warn' if missing else 'ok',
    'הכל רץ' if not missing else 'לא רץ: ' + ', '.join(missing), f'{len(running)} קונטיינרים')

stats = sh("docker stats --no-stream --format '{{.MemUsage}}' expo-wa")
sessions = len([d for d in os.listdir('/opt/expo-wa/data/sessions') if not d.startswith('.')]) if os.path.isdir('/opt/expo-wa/data/sessions') else 0
add('wa.server', 'שרת הוואטסאפ: זיכרון וחשבונות', 'ok' if stats else 'bad', f'{stats.split("/")[0].strip() or "?"} · {sessions} חשבונות שמורים', platform='wa')

restarts = sh("cat " + state + "/restarts 2>/dev/null")
add('wa.watchdog', 'הפעלה מחדש אוטומטית', 'warn' if restarts else 'ok', restarts or 'לא היה צורך', 'השומר בודק כל דקה, ומפעיל מחדש אחרי 3 כישלונות', platform='wa')

# The backup (backup.sh, every 6 hours) and the drill (backup-drill.sh) leave their outcome in a file; the age is
# judged here, so a backup that stopped running shows as one.
from datetime import datetime, timezone
def outcome(name):
    try: return json.load(open(f'{state}/{name}.json'))
    except Exception: return None
b = outcome('backup')
if b is None:
    add('vps.backup', 'גיבוי (כל 6 שעות)', 'warn', 'עוד לא הוגדר', 'מחכה למפתחות: backup-setup.sh')
else:
    hours = (datetime.now(timezone.utc) - datetime.fromisoformat(b['at'])).total_seconds() / 3600
    if b['level'] == 'ok' and hours > 7:
        add('vps.backup', 'גיבוי (כל 6 שעות)', 'bad', f'לא רץ {int(hours)} שעות', f'האחרון: {b["value"]}')
    else:
        add('vps.backup', 'גיבוי (כל 6 שעות)', b['level'], b['value'], b.get('detail') or None)
d = outcome('drill')
add('vps.drill', 'ניסוי שחזור', d['level'] if d else 'warn', d['value'] if d else 'עוד לא נעשה',
    d.get('detail') if d else 'backup-drill.sh: לפני 11/11, ואז פעם בחודש')

reboot = os.path.exists('/var/run/reboot-required')
add('vps.reboot', 'עדכון שמחכה לאתחול', 'warn' if reboot else 'ok', 'כן' if reboot else 'לא')
up = int(float(open('/proc/uptime').read().split()[0]) // 86400)
add('vps.uptime', 'זמן ריצה', 'ok', f'{up} ימים')
print(json.dumps(checks, ensure_ascii=False))
PY

python3 -c 'import json,sys; print(json.dumps({"p_key": open("/dev/stdin").read().strip(), "p_checks": json.load(open(sys.argv[1]))}))' "$STATE/report.json" <<<"$OPS_KEY" \
  | curl -s -m 20 -o /dev/null -w '%{http_code}\n' -X POST "$SUPABASE_URL/rest/v1/rpc/ops_report" \
      -H "apikey: $SUPABASE_KEY" -H 'Content-Type: application/json' --data-binary @- > "$STATE/last-status"
