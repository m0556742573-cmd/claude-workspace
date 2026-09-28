#!/usr/bin/env bash
# Builds prototype/dist/ — a standalone copy that can be dropped on any static host
# (Cloudflare Pages, Netlify, a folder on the VPS). No account, no build tools.
#
# The page published as a Claude Artifact is index.html, which is a fragment: the
# publisher wraps it in its own <head>. A plain web host needs the whole document,
# so this writes one and copies the two asset files next to it.
#
#   bash myProjekts/אקספו\ לידים/prototype/build-dist.sh
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/dist"
mkdir -p "$out"
cp "$here/app.css" "$here/app.js" "$out/"

cat > "$out/index.html" <<'HTML'
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>דוכן חכם — הדגמה</title>
<meta name="description" content="הדגמה של כלי לידים למציגי האקספו">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700&display=swap">
<link rel="stylesheet" href="app.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📇</text></svg>">
</head>
<body>
<div id="app" dir="rtl" lang="he">
  <header id="topbar" class="topbar"></header>
  <main id="main"></main>
</div>
<script src="app.js"></script>
</body>
</html>
HTML

echo "dist ready:"
ls -la "$out"
echo
echo "Upload the dist folder to any static host. Demo data only - no real names."
