// Builds the engine playground: the engine's own source (types stripped by Node), the fixtures as data,
// and hebcal from the CDN, into one page. Run: node playground/build.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fixtures } from '../engine/fixtures/businesses.ts';

const dir = new URL('.', import.meta.url);
const src = (f: string) => readFileSync(new URL(`../engine/src/${f}`, dir), 'utf8');
const js = (f: string) => stripTypeScriptTypes(src(f)).split('\n').filter((l) => !/^\s*import\s/.test(l)).join('\n');

const engine = [js('calendar.ts'), js('engine.ts')].join('\n');
const page = readFileSync(new URL('template.html', dir), 'utf8')
  .replace('/*ENGINE*/', () => engine)
  .replace('/*FIXTURES*/[]', () => JSON.stringify(fixtures));
writeFileSync(new URL('engine-playground.html', dir), page);
console.log('engine-playground.html', page.length, 'chars,', fixtures.length, 'businesses');
