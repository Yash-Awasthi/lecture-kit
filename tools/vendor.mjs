// Collects every third-party dependency into vendor/ so build.mjs can produce fully offline files.
// Needs `npm install` in the kit folder first. Python packages are downloaded from the Pyodide CDN
// together with their dependencies and cached, so later runs only fetch what is new.
// usage: node tools/vendor.mjs [python packages...]      e.g. node tools/vendor.mjs numpy scikit-learn matplotlib
//        node tools/vendor.mjs --deck <deck-dir>          packages from that deck's deck.json
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
if (!existsSync(join(nm, 'pyodide'))) { console.error('node_modules missing: run npm install in ' + root); process.exit(1); }
const out = join(root, 'vendor'), pyo = join(out, 'pyodide');
mkdirSync(pyo, { recursive: true });
const PYO_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const args = process.argv.slice(2);
let packages = ['numpy'];
if (args[0] === '--deck') packages = JSON.parse(readFileSync(join(resolve(args[1]), 'deck.json'), 'utf8')).python?.packages || ['numpy'];
else if (args.length) packages = args;

const store = (name, raw) => {
  const gz = gzipSync(raw, { level: 9 });
  if (gz.length < raw.length * .9) writeFileSync(join(pyo, name + '.gz'), gz); else writeFileSync(join(pyo, name), raw);
  console.log(name.padEnd(56), (raw.length / 1048576).toFixed(1), 'MB');
};
const have = name => existsSync(join(pyo, name)) || existsSync(join(pyo, name + '.gz'));

if (!existsSync(join(out, 'three-bundle.js'))) {
  // three.js + OrbitControls + CSS2DRenderer as one classic script exposing the globals the page expects.
  const esbuild = createRequire(join(nm, 'x.js'))('esbuild');
  await esbuild.build({
    stdin: {
      contents: `import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
window.THREE = THREE; window.OrbitControls = OrbitControls; window.CSS2DRenderer = CSS2DRenderer; window.CSS2DObject = CSS2DObject;
window.dispatchEvent(new Event('three-ready'));`, resolveDir: root, loader: 'js'
    },
    bundle: true, minify: true, format: 'iife', outfile: join(out, 'three-bundle.js'), logLevel: 'error'
  });
  // KaTeX with its woff2 fonts inlined (woff and ttf fallbacks dropped).
  const kd = join(nm, 'katex', 'dist');
  let kcss = readFileSync(join(kd, 'katex.min.css'), 'utf8');
  kcss = kcss.replace(/src:url\(fonts\/([\w-]+\.woff2)\) format\("woff2"\)(,url\([^)]*\) format\("[^"]*"\))*/g,
    (_, f) => `src:url(data:font/woff2;base64,${readFileSync(join(kd, 'fonts', f)).toString('base64')}) format("woff2")`);
  writeFileSync(join(out, 'katex.css'), kcss);
  copyFileSync(join(kd, 'katex.min.js'), join(out, 'katex.min.js'));
  copyFileSync(join(nm, 'codemirror', 'lib', 'codemirror.js'), join(out, 'codemirror.js'));
  copyFileSync(join(nm, 'codemirror', 'lib', 'codemirror.css'), join(out, 'codemirror.css'));
  copyFileSync(join(nm, 'codemirror', 'mode', 'python', 'python.js'), join(out, 'python.js'));
  copyFileSync(join(nm, 'qrcode-generator', 'qrcode.js'), join(out, 'qrcode.js'));
  // Inter and JetBrains Mono, latin subset, inlined.
  const ua = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
  const gcss = await (await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap', { headers: ua })).text();
  let fcss = '';
  for (const b of gcss.split('/* ').filter(b => b.startsWith('latin */'))) {
    const url = b.match(/url\((https:[^)]+\.woff2)\)/)[1];
    fcss += b.slice('latin */'.length).replace(url, `data:font/woff2;base64,${Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64')}`) + '\n';
  }
  writeFileSync(join(out, 'fonts.css'), fcss);
  console.log('three.js, KaTeX, CodeMirror, QR and fonts vendored');
}

// Python runtime from the npm package, then the wheels for the requested packages and their dependencies.
const pd = join(nm, 'pyodide');
for (const f of ['pyodide.js', 'pyodide.asm.js']) if (!have(f)) copyFileSync(join(pd, f), join(pyo, f));
for (const f of ['pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) if (!have(f)) store(f, readFileSync(join(pd, f)));
const lockP = existsSync(join(pyo, 'pyodide-lock.json.gz')) ? gunzipSync(readFileSync(join(pyo, 'pyodide-lock.json.gz'))) : readFileSync(join(pyo, 'pyodide-lock.json'));
const lock = JSON.parse(lockP.toString('utf8'));
const need = new Set(), add = n => { const k = n.toLowerCase(), p = lock.packages[k]; if (!p) throw new Error('unknown Pyodide package ' + n); if (need.has(k)) return; need.add(k); p.depends.forEach(add); };
packages.forEach(add);
for (const k of need) {
  const f = lock.packages[k].file_name; if (have(f)) continue;
  const r = await fetch(PYO_CDN + f); if (!r.ok) throw new Error(`download failed ${f}: ${r.status}`);
  store(f, Buffer.from(await r.arrayBuffer()));
}
console.log(`Python packages ready: ${[...need].sort().join(', ')}`);
