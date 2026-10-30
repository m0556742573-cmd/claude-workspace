// Builds the control center into worker/public/admin: the logo and favicon go inline into the page,
// and config.js is written from .env.local (kept out of git). With --demo the app runs on sample data.
//   node admin/build.mjs          real build (needs admin/.env.local with SUPABASE_URL and SUPABASE_KEY)
//   node admin/build.mjs --demo   sample data, for looking at the screens
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, 'app');
const out = join(here, 'worker', 'public', 'admin');
const svgDir = join(here, '..', 'מותג', 'סופי', 'לוגו', 'svg');
const demo = process.argv.includes('--demo');

// the logo takes its colours from the theme: letters, loose pieces, the line
const CLASS = { '#F2F5EE': 'l', '#7F9488': 'o', '#C9F26B': 'n' };
const logo = readFileSync(join(svgDir, 'yhm-logo-on-dark.svg'), 'utf8')
  .replace(/<svg /, '<svg class="logo-svg" aria-hidden="true" focusable="false" ')
  .replace(/ role="img" aria-label="YHM"/, '')
  .replace(/fill="(#[0-9A-F]{6})"/gi, (m, c) => CLASS[c.toUpperCase()] ? `class="${CLASS[c.toUpperCase()]}"` : m);
const icon = 'data:image/svg+xml,' + encodeURIComponent(readFileSync(join(svgDir, 'yhm-icon.svg'), 'utf8'));

let config;
if (demo) config = { demo: true };
else {
  const envFile = join(here, '.env.local');
  if (!existsSync(envFile)) throw new Error('admin/.env.local is missing (SUPABASE_URL, SUPABASE_KEY). For sample data: --demo');
  const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) throw new Error('admin/.env.local needs SUPABASE_URL and SUPABASE_KEY');
  config = { url: env.SUPABASE_URL, key: env.SUPABASE_KEY };
}

// each file's address carries a hash of its content, so a browser never keeps an old copy after a deploy
mkdirSync(out, { recursive: true });
const files = { 'app.css': readFileSync(join(app, 'app.css')), 'app.js': readFileSync(join(app, 'app.js')), 'config.js': Buffer.from('window.YHM_CONFIG = ' + JSON.stringify(config) + ';\n') };
let page = readFileSync(join(app, 'index.tpl.html'), 'utf8').replace('__LOGO__', logo).replace('__FAVICON__', icon);
for (const [f, body] of Object.entries(files)) {
  writeFileSync(join(out, f), body);
  page = page.replace('/admin/' + f + '"', '/admin/' + f + '?v=' + createHash('sha256').update(body).digest('hex').slice(0, 10) + '"');
}
writeFileSync(join(out, 'index.html'), page);
console.log((demo ? 'demo' : 'live') + ' build → ' + out);
