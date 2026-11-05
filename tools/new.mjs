// Creates a new deck folder from template/.
// usage: node tools/new.mjs <deck-dir> [--title "Deck title"] [--no-workshop]
import { cpSync, existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && a !== args[args.indexOf('--title') + 1]);
if (!dir) { console.error('usage: node tools/new.mjs <deck-dir> [--title "Deck title"] [--no-workshop]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} exists and is not empty`); process.exit(1); }
cpSync(join(root, 'template'), out, { recursive: true });
const title = args.includes('--title') ? args[args.indexOf('--title') + 1] : basename(out);
const cfg = JSON.parse(readFileSync(join(out, 'deck.json'), 'utf8'));
cfg.name = basename(out).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck'; cfg.title = title;
writeFileSync(join(out, 'deck.json'), JSON.stringify(cfg, null, 2) + '\n');
for (const f of ['slides/1-intro.js', 'notes.md']) writeFileSync(join(out, f), readFileSync(join(out, f), 'utf8').replaceAll('Deck title', title));
if (args.includes('--no-workshop')) {
  rmSync(join(out, 'workshop.js'));
  writeFileSync(join(out, 'slides/9-end.js'), `'use strict';\nSLIDES.push(thanksSlide({ sources: [] }));\n`);
}
console.log(`created ${out}\nnext: edit slides/, workshop.js and notes.md, then\n  node ${join(root, 'build.mjs')} "${out}"\n  node ${join(root, 'tools', 'check.mjs')} "${out}"`);
