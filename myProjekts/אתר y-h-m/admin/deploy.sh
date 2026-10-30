#!/usr/bin/env bash
# Builds the control center and puts it on y-h-m.com (Cloudflare Worker "yhm-hq").
# Needs admin/.env.local with SUPABASE_URL and SUPABASE_KEY (the publishable key), and a wrangler login.
# The first time only:  bash admin/deploy.sh --salt   (creates the secret that keeps visitor codes unguessable)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
wrangler="node C:/Users/user/claude/myProjekts/expo-system/node_modules/wrangler/bin/wrangler.js"
config="$here/worker/wrangler.toml"

node "$here/build.mjs"
url=$(grep '^SUPABASE_URL=' "$here/.env.local" | cut -d= -f2- | tr -d '\r')
key=$(grep '^SUPABASE_KEY=' "$here/.env.local" | cut -d= -f2- | tr -d '\r')

$wrangler deploy --config "$config" --var "SUPABASE_URL:$url" --var "SUPABASE_KEY:$key"

# after the Worker exists; until the secret is there, the Worker counts nothing
if [ "${1:-}" = "--salt" ]; then
  # random, never printed
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | $wrangler secret put HQ_SALT --config "$config"
fi
