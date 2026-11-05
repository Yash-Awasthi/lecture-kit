// Builds a deck folder into single-file HTML:
//   dist/<name>.html          small; loads KaTeX, three.js, CodeMirror and Python from CDNs
//   dist/<name>-offline.html  everything embedded, runs with no network (needs vendor/, see tools/vendor.mjs)
// plus serve.mjs and double-click launchers, so dist/ can be copied anywhere and presented.
// usage: node build.mjs <deck-dir> [--online-only]
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const kitRoot = dirname(fileURLToPath(import.meta.url));
const deckDir = resolve(process.argv[2] || '.');
const onlineOnly = process.argv.includes('--online-only');
const kit = join(kitRoot, 'kit'), vendor = join(kitRoot, 'vendor');
const read = (...p) => readFileSync(join(...p), 'utf8');
if (!existsSync(join(deckDir, 'deck.json'))) { console.error(`no deck.json in ${deckDir}`); process.exit(1); }

const cfg = JSON.parse(read(deckDir, 'deck.json'));
const name = cfg.name || 'deck';
const packages = cfg.python?.packages || ['numpy'];
const slideFiles = readdirSync(join(deckDir, 'slides')).filter(f => f.endsWith('.js')).sort();
const hasWs = existsSync(join(deckDir, 'workshop.js'));
const notes = existsSync(join(deckDir, 'notes.md')) ? read(deckDir, 'notes.md') : '';

// A literal "</script" inside inlined text would end the tag early.
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const script = js => `<script>\n${safe(js)}\n</script>`;
const style = css => `<style>\n${css}\n</style>`;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp' };
// 'assets/x.png' string literals in deck code become data URIs, so the output is one file.
const inlineAssets = js => js.replace(/(['"`])assets\/([\w.\-/]+)\1/g, (m, q, f) => {
  const p = join(deckDir, 'assets', f);
  if (!existsSync(p)) { console.warn('missing asset', f); return m; }
  return `${q}data:${MIME[extname(f).toLowerCase()] || 'application/octet-stream'};base64,${readFileSync(p).toString('base64')}${q}`;
});

const deckJs = [
  hasWs ? `/* workshop.js */\n` + read(deckDir, 'workshop.js') : '',
  ...slideFiles.map(f => `/* slides/${f} */\n` + read(deckDir, 'slides', f))
].map(inlineAssets).join('\n\n');

const CDN = {
  css: [
    '<link rel="preconnect" href="https://cdn.jsdelivr.net">',
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">',
    hasWs ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.css">' : ''],
  js: [
    '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>',
    hasWs ? '<script src="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/python/python.js"></script>' : '',
    '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>',
    `<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/" } }</script>
<script type="module">
import * as THREE_ from 'three';
import { OrbitControls as OC } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer as CR, CSS2DObject as CO } from 'three/addons/renderers/CSS2DRenderer.js';
window.THREE = THREE_; window.OrbitControls = OC; window.CSS2DRenderer = CR; window.CSS2DObject = CO;
window.dispatchEvent(new Event('three-ready'));
</script>`]
};
const LOCAL = () => ({
  css: [style(read(vendor, 'katex.css')), style(read(vendor, 'fonts.css')), hasWs ? style(read(vendor, 'codemirror.css')) : ''],
  js: [script(read(vendor, 'katex.min.js')), hasWs ? script(read(vendor, 'codemirror.js')) + '\n' + script(read(vendor, 'python.js')) : '', script(read(vendor, 'qrcode.js')), script(read(vendor, 'three-bundle.js'))]
});

function page(lib, pyBlocks = '') {
  const DECK = { title: cfg.title, name, keys: cfg.keys || {}, controls: cfg.controls || {} };
  return `<!DOCTYPE html>
<html lang="${cfg.lang || 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cfg.title || name}</title>
${lib.css.filter(Boolean).join('\n')}
${style(read(kit, 'style.css'))}
${hasWs ? style(read(kit, 'workshop.css')) : ''}
${cfg.css ? style(read(deckDir, cfg.css)) : ''}
${lib.js.filter(Boolean).join('\n')}
</head>
<body>
<div id="viewport"><div id="stage"></div></div>
<div id="workshop" hidden></div>
<script type="text/markdown" id="deck-notes">${safe(notes)}</script>
${hasWs ? `<script type="text/plain" id="deck-py">${safe(read(kit, 'deck.py'))}</script>` : ''}
${pyBlocks}
${script('window.DECK = ' + JSON.stringify(DECK) + ';')}
${['engine.js', 'shapes.js', 'blocks.js', 'player.js', ...(hasWs ? ['workshop.js'] : [])].map(f => script(read(kit, f))).join('\n')}
${script(deckJs)}
<script>startDeck();</script>
</body>
</html>`;
}

// Pyodide core plus the wheels for the deck's packages and everything they depend on.
function pyodideBlocks() {
  const dir = join(vendor, 'pyodide');
  const file = f => existsSync(join(dir, f + '.gz')) ? { p: join(dir, f + '.gz'), gz: 1 } : existsSync(join(dir, f)) ? { p: join(dir, f), gz: 0 } : null;
  const lockF = file('pyodide-lock.json'); if (!lockF) throw new Error('vendor/pyodide/pyodide-lock.json missing: run node tools/vendor.mjs');
  const lock = JSON.parse((lockF.gz ? gunzipSync(readFileSync(lockF.p)) : readFileSync(lockF.p)).toString('utf8'));
  const need = new Set(), add = n => { const k = n.toLowerCase(); const p = lock.packages[k]; if (!p) throw new Error('unknown Python package ' + n); if (need.has(k)) return; need.add(k); p.depends.forEach(add); };
  packages.forEach(add);
  const files = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json', ...[...need].map(k => lock.packages[k].file_name)];
  return files.map(f => {
    const it = file(f); if (!it) throw new Error(`vendor/pyodide/${f} missing: run node tools/vendor.mjs ${packages.join(' ')}`);
    const body = readFileSync(it.p);
    return f.endsWith('.js')
      ? `<script type="text/plain" data-pyo="${f}">${safe(body.toString('utf8').replace(/^\/\/# sourceMappingURL=.*$/m, ''))}</script>`
      : `<script type="text/plain" data-pyo="${f}" data-gz="${it.gz}">${body.toString('base64')}</script>`;
  }).join('\n') + '\n<script>window.PYO_EMBEDDED = true;</script>';
}

const out = join(deckDir, 'dist'); mkdirSync(out, { recursive: true });
const mb = s => (Buffer.byteLength(s) / 1048576).toFixed(2) + ' MB';
const online = page(CDN);
writeFileSync(join(out, `${name}.html`), online);
console.log(`dist/${name}.html`.padEnd(40), mb(online));
let main = `${name}.html`;
if (!onlineOnly && existsSync(join(vendor, 'three-bundle.js'))) {
  const off = page(LOCAL(), hasWs ? pyodideBlocks() : '');
  writeFileSync(join(out, `${name}-offline.html`), off);
  console.log(`dist/${name}-offline.html`.padEnd(40), mb(off));
  main = `${name}-offline.html`;
} else if (!onlineOnly) console.log('vendor/ not found: offline build skipped (run npm install, then node tools/vendor.mjs)');

// Portable launchers next to the HTML.
copyFileSync(join(kitRoot, 'serve.mjs'), join(out, 'serve.mjs'));
const bat = hash => `@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul\r\nif %errorlevel%==0 goto node\r\necho Node.js not found, using Python on port 8000\r\nstart "" "http://localhost:8000/${main}#${hash}"\r\npython -m http.server 8000 --bind 127.0.0.1\r\ngoto end\r\n:node\r\nnode serve.mjs ${main} ${hash}\r\n:end\r\npause\r\n`;
writeFileSync(join(out, 'start.bat'), bat('1'));
writeFileSync(join(out, 'start.sh'), `#!/bin/sh\ncd "$(dirname "$0")"\nnode serve.mjs ${main} 1 || python3 -m http.server 8000 --bind 127.0.0.1\n`);
if (hasWs) writeFileSync(join(out, 'start-workshop.bat'), bat('workshop'));
if (notes) copyFileSync(join(deckDir, 'notes.md'), join(out, 'notes.md'));
