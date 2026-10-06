#!/usr/bin/env bash
# Builds prototype-v3/dist/ — a standalone copy for any static host (Cloudflare Pages).
# index.html is an artifact fragment; a plain host needs the whole document.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/dist"
mkdir -p "$out"
cp "$here/app.css" "$here/app.js" "$here/people.js" "$here/hebcal.js" "$out/"
cat > "$out/index.html" <<'HTML'
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>דוכן חכם · דוגמית 3</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Frank+Ruhl+Libre:wght@500;700&display=swap">
<link rel="stylesheet" href="app.css">
</head>
<body>
<div id="app" dir="rtl" lang="he">
  <header id="top" class="top"></header>
  <main id="main"></main>
</div>
<script src="hebcal.js"></script>
<script src="people.js"></script>
<script src="app.js"></script>
</body>
</html>
HTML
echo "dist ready: $out"
