// Checks a built deck in headless Chrome: plays every step of every slide, reports script errors,
// text that overlaps other text or leaves the 1600x900 stage, screenshots each slide's final state,
// exercises the presenter tools and notes window, and runs every workshop cell (out of order, then all).
// usage: node tools/check.mjs <deck-dir> [--online] [--fast] [--no-shots] [--slides 3-9] [--browser <exe>]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = f => args.includes(f), opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const deckDir = resolve(args.find(a => !a.startsWith('--') && a !== opt('--browser') && a !== opt('--slides')) || '.');
const cfg = JSON.parse(readFileSync(join(deckDir, 'deck.json'), 'utf8')), name = cfg.name || 'deck';
const file = join(deckDir, 'dist', flag('--online') || !existsSync(join(deckDir, 'dist', `${name}-offline.html`)) ? `${name}.html` : `${name}-offline.html`);
if (!existsSync(file)) { console.error(`${file} missing: run node build.mjs ${deckDir}`); process.exit(1); }

function findBrowser() {
  const c = [opt('--browser'), process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const cache = join(homedir(), '.cache', 'puppeteer', 'chrome');
  if (existsSync(cache)) for (const v of readdirSync(cache).sort().reverse()) for (const sub of ['chrome-win64/chrome.exe', 'chrome-linux64/chrome', 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing']) c.push(join(cache, v, sub));
  return c.find(p => p && existsSync(p));
}
const exe = findBrowser();
if (!exe) { console.error('No Chrome found. Install one with: npx @puppeteer/browsers install chrome@stable  (or pass --browser <path>)'); process.exit(1); }
const puppeteer = createRequire(join(root, 'node_modules', 'x.js'))('puppeteer-core');

const shots = join(deckDir, 'check');
if (!flag('--no-shots')) { rmSync(shots, { recursive: true, force: true }); mkdirSync(shots, { recursive: true }); }
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--window-size=1600,900'], protocolTimeout: 600000 });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
if (!flag('--online')) await page.setOfflineMode(true);
let errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const url = pathToFileURL(file).href;
const idle = () => page.waitForFunction(() => !Deck.running && !Deck.busy, { timeout: 120000 });
let fails = 0, warns = 0;
const fail = m => { fails++; console.log('FAIL ' + m); }, warn = m => { warns++; console.log('WARN ' + m); }, ok = m => console.log('ok   ' + m);

await page.goto(url + '#1');
await page.waitForFunction(() => typeof Deck !== 'undefined' && Deck.i >= 0 && !Deck.busy, { timeout: 60000 });
const slides = await page.evaluate(() => SLIDES.map(s => ({ title: s.title, ws: !!s.workshop })));
let [lo, hi] = (opt('--slides') || `1-${slides.length}`).split('-').map(Number); hi = hi || lo;
console.log(`${slides.length} slides in ${file}`);

// Visible text boxes on the current slide, in stage coordinates.
const audit = () => page.evaluate(() => {
  const st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 1600, out = { oob: [], overlap: [] };
  const vis = e => { for (let x = e; x && x.id !== 'stage'; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .05) return false; } return true; };
  const els = [...Deck.scene.root.querySelectorAll('.hl > .tx')].filter(e => vis(e) && e.textContent.trim()).map(e => {
    const r = e.getBoundingClientRect(), pad = r.height * .15; return { t: e.textContent.trim().slice(0, 40), x: (r.left - st.left) / k, y: (r.top + pad - st.top) / k, w: r.width / k, h: (r.height - 2 * pad) / k };
  }).filter(b => b.w > 1 && b.h > 1);
  for (const b of els) if (b.x < -2 || b.y < -2 || b.x + b.w > 1602 || b.y + b.h > 902) out.oob.push(`"${b.t}" at ${b.x | 0},${b.y | 0} size ${b.w | 0}x${b.h | 0}`);
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j], ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ix > 3 && iy > 3 && ix * iy > .12 * Math.min(a.w * a.h, b.w * b.h)) out.overlap.push(`"${a.t}" / "${b.t}"`);
  }
  return out;
});

for (let i = lo - 1; i < Math.min(hi, slides.length); i++) {
  if (slides[i].ws) continue;
  errs = [];
  const t0 = Date.now();
  if (flag('--fast')) { await page.evaluate(k => goto(k, Infinity, { instant: true }), i); await idle(); }
  else {
    await page.evaluate(k => { Anim.speed = 4; return goto(k, 1); }, i); await idle();
    for (let g = 0; g < 60 && await page.evaluate(() => Deck.step < Deck.steps.length); g++) { await page.evaluate(() => next()); await idle(); }
  }
  await new Promise(r => setTimeout(r, 250));
  const a = await audit(), n = String(i + 1).padStart(2, '0'), steps = await page.evaluate(() => Deck.steps.length);
  if (!flag('--no-shots')) await page.screenshot({ path: join(shots, `${n}.png`) });
  const label = `slide ${i + 1} "${slides[i].title}" (${steps} steps, ${((Date.now() - t0) / 1000).toFixed(1)} s)`;
  if (errs.length) fail(`${label}: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
  else if (a.oob.length || a.overlap.length) warn(`${label}: ${a.oob.length ? 'outside stage: ' + a.oob.slice(0, 3).join('; ') + ' ' : ''}${a.overlap.length ? 'overlapping text: ' + a.overlap.slice(0, 4).join('; ') : ''}`);
  else ok(label);
}

// Presenter tools and notes window.
errs = [];
const firstSlide = slides.findIndex(s => !s.ws);
await page.evaluate(k => goto(k, 1, { instant: true }), firstSlide); await idle();
for (const k of ['l', 'd']) await page.keyboard.press(k);
await page.mouse.move(400, 400); await page.mouse.down(); await page.mouse.move(600, 450, { steps: 8 }); await page.mouse.up();
const strokes = await page.evaluate(() => Ink.list().length);
for (const k of ['h', 'e', 'c', 'w', 'Escape', 'Escape', 'b', 'Escape', 'z', 'Escape', '?', 'Escape', 'o', 'Escape']) await page.keyboard.press(k);
const pres = await page.evaluate(async () => { Presenter.open(); await new Promise(r => setTimeout(r, 300)); const w = Presenter.win; if (!w) return -1; const n = w.document.querySelectorAll('#p-notes li, #p-notes p').length; w.close(); return n; });
if (errs.length || strokes !== 1) fail(`presenter tools: ${strokes} pen stroke(s) recorded, errors: ${errs.slice(0, 3).join(' | ') || 'none'}`);
else ok(`presenter tools (laser, pen, highlighter, eraser, clear, whiteboard, blackout, zoom, help, outline); presenter window ${pres >= 0 ? `opened, ${pres} note blocks on slide ${firstSlide + 1}` : 'blocked'}`);

// Workshop.
const wsI = slides.findIndex(s => s.ws);
if (wsI >= 0 && !flag('--no-workshop')) {
  errs = [];
  await page.goto(url + `?check#${wsI + 1}`);
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector('#ws-status.ok, #ws-status.bad'), { timeout: 300000 });
  const st = await page.$eval('#ws-status', e => e.textContent);
  if (!st.includes('ready')) fail(`workshop: Python did not start: ${st}`);
  else {
    ok(`workshop: Python ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    const ids = await page.evaluate(() => Workshop.cfg.cells.map(c => c.id));
    const state = () => page.evaluate(() => ({ err: [...document.querySelectorAll('.ws-cell.err')].map(e => ({ id: e.id.slice(3), out: (e.querySelector('.ws-out')?.textContent || '').trim().split('\n').slice(-4).join(' / ') })), done: Workshop.done.size }));
    const t1 = Date.now();
    await page.evaluate(id => Workshop.run(id), ids[ids.length - 1]);
    let s = await state();
    if (s.err.length) fail(`workshop, last cell run first (earlier cells replayed): ${s.err.map(e => `${e.id}: ${e.out}`).join(' | ')}`);
    else ok(`workshop: ran cell ${ids.length} first, all ${s.done} cells replayed in order (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
    await page.evaluate(() => Workshop.runAll()); s = await state();
    if (s.err.length) fail(`workshop run all: ${s.err.map(e => `${e.id}: ${e.out}`).join(' | ')}`); else ok(`workshop: run all, ${s.done}/${ids.length} cells ok`);
    const charts = await page.evaluate(() => [...document.querySelectorAll('.ws-panel')].length);
    console.log(`     ${charts} charts drawn`);
    if (!flag('--no-shots')) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: join(shots, 'workshop.png') }); }
  }
  if (errs.length) fail('workshop page errors: ' + [...new Set(errs)].slice(0, 3).join(' | '));
}
await browser.close();
console.log(`\n${fails} failed, ${warns} warnings${flag('--no-shots') ? '' : `; screenshots in ${shots}`}`);
process.exit(fails ? 1 : 0);
