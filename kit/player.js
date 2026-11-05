'use strict';
/* Slide player: stepped navigation, configurable keys, presenter tools (laser, pen, highlighter,
   eraser, whiteboard, blackout, zoom), a presenter window with speaker notes, outline and help.
   Deck settings come from window.DECK (deck.json), notes from <script type="text/markdown" id="deck-notes">. */

const SLIDES = [];
const DECK = Object.assign({ title: 'Slides', keys: {}, controls: {} }, window.DECK || {});
const Deck = { i: -1, step: 0, steps: [], scene: null, running: false, cur: null, busy: false, recs: [] };
const $ = id => document.getElementById(id);

/* ---------- slides and steps ---------- */
function fit() {
  const s = Math.min(innerWidth / SW, innerHeight / SH); stageScale = s;
  $('stage').style.transform = `translate(-50%,-50%) scale(${s})`;
  Ink.redraw();
}
function runStep(k) {
  Deck.running = true;
  const rec = []; Deck.recs[k] = rec; Anim.rec = rec; Anim.rec0 = performance.now();
  Deck.cur = (async () => { try { await Deck.steps[k](); } catch (e) { console.error(e); } })().then(() => {
    if (Anim.rec === rec) Anim.rec = null;
    Deck.running = false; Anim.skip = false; updateChrome();
  });
  return Deck.cur;
}
// Shows slide i with `upto` steps completed. All but the last run instantly; the last animates unless o.instant.
async function goto(i, upto = 1, o = {}) {
  i = Math.round(clamp(i, 0, SLIDES.length - 1));
  if (Deck.busy) return; Deck.busy = true;
  try {
    if (Deck.running) { Anim.skip = true; finishAll(); await Deck.cur; }
    finishAll(); Anim.skip = false; Anim.rec = null;
    if (Deck.scene) { Deck.scene.dispose(); Deck.scene = null; }
    if (Deck.i !== i) Tools.leaveSlide();
    const sl = SLIDES[i]; Deck.i = i; Deck.step = 0; Deck.steps = []; Deck.recs = [];
    const ws = $('workshop'), vp = $('viewport');
    if (sl.workshop) { vp.hidden = true; ws.hidden = false; document.body.classList.add('in-ws'); if (typeof Workshop !== 'undefined') Workshop.enter(); }
    else {
      ws.hidden = true; vp.hidden = false; document.body.classList.remove('in-ws');
      const root = document.createElement('div'); root.className = 'slide-root' + (o.nofade ? ' nofade' : '');
      $('stage').appendChild(root);
      const sc = new Scene(root); Deck.scene = sc;
      let steps = []; try { steps = sl.build(sc) || []; } catch (e) { console.error(e); }
      Deck.steps = steps;
      const n = Math.min(upto, steps.length), quick = o.instant ? n : n - 1;
      Anim.skip = true;
      for (let k = 0; k < quick; k++) { try { await steps[k](); } catch (e) { console.error(e); } }
      Anim.skip = false; Deck.step = quick;
      if (n > quick) { Deck.step = n; runStep(n - 1); }
    }
    history.replaceState(null, '', location.pathname + location.search + '#' + (i + 1));
    updateChrome(); Ink.redraw();
  } finally { Deck.busy = false; }
}
const onWorkshop = () => !!SLIDES[Deck.i]?.workshop;
function next() {
  if (Deck.busy || onWorkshop()) return;
  if (Deck.running) { Anim.skip = true; finishAll(); return; }
  if (Deck.step < Deck.steps.length) { runStep(Deck.step++); updateChrome(); }
  else if (Deck.i < SLIDES.length - 1) goto(Deck.i + 1);
}
function stepBack() {
  if (Deck.busy || onWorkshop()) return;
  if (Deck.running) { Anim.skip = true; finishAll(); }
  if (Deck.step > 1) goto(Deck.i, Deck.step - 1, { instant: true, nofade: true });
  else if (Deck.i > 0) goto(Deck.i - 1, Infinity, { instant: true });
}
async function reverseStep() {
  if (Deck.busy || onWorkshop()) return;
  if (Deck.running) { Anim.skip = true; finishAll(); await Deck.cur; }
  const k = Deck.step - 1, rec = Deck.recs[k];
  if (Deck.step <= 1 || !rec || !rec.length) return stepBack();
  Deck.busy = true; flash('reverse');
  const items = rec.slice().sort((a, b) => a.start - b.start), T = Math.max(...items.map(r => r.start + r.d));
  // Not-yet-started tweens are reset latest-first, then started ones applied earliest-first, so the most recent writer wins.
  await new Promise(res => {
    const t0 = performance.now();
    const f = now => {
      const tau = Math.max(0, T - (now - t0) * Anim.speed);
      for (let j = items.length - 1; j >= 0; j--) if (items[j].start > tau) try { items[j].fn(items[j].e(0)); } catch (_) { }
      for (const r of items) if (r.start <= tau) try { r.fn(r.e(r.d ? clamp((tau - r.start) / r.d) : 1)); } catch (_) { }
      if (tau > 0 && Deck.scene) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  Deck.busy = false;
  await goto(Deck.i, k, { instant: true, nofade: true });
}
const SPEEDS = [1, 2, 4];
function cycleSpeed() { Anim.speed = SPEEDS[(SPEEDS.indexOf(Anim.speed) + 1) % SPEEDS.length]; flash(`speed ${Anim.speed}×`); updateChrome(); }
function slideNext() { if (Deck.i < SLIDES.length - 1) goto(Deck.i + 1); }
function slidePrev() { if (Deck.i > 0) goto(Deck.i - 1); }
let _flashT = 0;
function flash(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(_flashT); _flashT = setTimeout(() => t.classList.remove('on'), 1000);
}
function updateChrome() {
  const n = SLIDES.length;
  $('ctr').textContent = `${Deck.i + 1} / ${n}`;
  $('prog').style.width = ((Deck.i + (Deck.steps.length ? Deck.step / Deck.steps.length : 1)) / n * 100) + '%';
  $('pl-speed').textContent = Anim.speed + '×';
  $('stepdots').innerHTML = Deck.steps.length > 1 ? Deck.steps.map((_, k) => `<i class="${k < Deck.step ? 'on' : ''}"></i>`).join('') : '';
  Presenter.update();
}

/* ---------- keys ---------- */
const ACTIONS = {
  next: ['next step', () => next()], prev: ['step back (instant)', () => stepBack()],
  nextSlide: ['next slide', () => slideNext()], prevSlide: ['previous slide', () => slidePrev()],
  reverse: ['play last step backwards', () => reverseStep()], speed: ['animation speed 1×, 2×, 4×', () => cycleSpeed()],
  replay: ['replay slide', () => goto(Deck.i)], first: ['first slide', () => goto(0)], last: ['last slide', () => goto(SLIDES.length - 1)],
  outline: ['outline', () => toggleOverlay('outline')], help: ['keys and tools', () => toggleOverlay('help')],
  presenter: ['presenter window with notes', () => Presenter.open()],
  laser: ['laser pointer', () => Tools.set('laser')], pen: ['pen', () => Tools.set('pen')], highlighter: ['highlighter', () => Tools.set('highlighter')],
  eraser: ['eraser', () => Tools.set('eraser')], clear: ['clear drawings on this slide', () => Ink.clear()],
  whiteboard: ['whiteboard', () => Tools.board()], blackout: ['blackout', () => Tools.black()], zoom: ['zoom (click a point)', () => Tools.set('zoom')],
  fullscreen: ['fullscreen', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => { })],
  chrome: ['show or hide the controls', () => document.body.classList.toggle('nochrome')]
};
const DEFAULT_KEYS = {
  next: ['ArrowRight', 'Space', 'PageDown', 'ArrowDown'], prev: ['ArrowLeft', 'PageUp', 'ArrowUp'],
  nextSlide: ['Ctrl+ArrowRight'], prevSlide: ['Ctrl+ArrowLeft'], reverse: ['Shift+ArrowLeft'], speed: ['Shift+ArrowRight'],
  replay: ['r'], first: ['Home'], last: ['End'], outline: ['o'], help: ['?'], presenter: ['p'],
  laser: ['l'], pen: ['d'], highlighter: ['h'], eraser: ['e'], clear: ['c'], whiteboard: ['w'], blackout: ['b', '.'], zoom: ['z'],
  fullscreen: ['f'], chrome: ['t']
};
// Actions that make sense on the workshop page, where arrows belong to the code editors.
const WS_OK = new Set(['nextSlide', 'prevSlide', 'outline', 'help', 'presenter', 'laser', 'pen', 'highlighter', 'eraser', 'clear', 'blackout', 'fullscreen', 'chrome', 'whiteboard']);
const normKey = s => { const p = s.split('+'), k = p.pop(); return [...p.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()), k.length > 1 ? k : k.toLowerCase()].join('+'); };
const KEYMAP = {};
function buildKeymap() {
  const keys = { ...DEFAULT_KEYS, ...(DECK.keys || {}) };
  for (const a in keys) for (const k of [].concat(keys[a])) KEYMAP[normKey(k)] = a;
  return keys;
}
function combo(e) {
  let k = e.key; if (k === ' ') k = 'Space';
  const named = k.length > 1;
  return (e.ctrlKey || e.metaKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey && named ? 'Shift+' : '') + (named ? k : k.toLowerCase());
}
function isTyping(t) { return t && t.closest && t.closest('input,textarea,select,.CodeMirror,[contenteditable="true"]'); }
let _num = '', _numT = 0;
function onKey(e) {
  if (isTyping(e.target)) return;
  if (Tools.blackOn) { e.preventDefault(); Tools.black(false); return; }
  if (e.key === 'Escape') { if (closeOverlays() || Tools.escape()) e.preventDefault(); return; }
  if (Tools.mode === 'pen' || Tools.mode === 'highlighter') {
    const n = parseInt(e.key); if (n >= 1 && n <= INK_COLORS.length) { Tools.color = INK_COLORS[n - 1]; flash('colour ' + n); Tools.paint(); return; }
  }
  if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey) { _num += e.key; clearTimeout(_numT); _numT = setTimeout(() => _num = '', 2000); flash('go to ' + _num); return; }
  if (e.key === 'Enter' && _num) { const n = +_num; _num = ''; goto(n - 1); return; }
  const a = KEYMAP[combo(e)]; if (!a) return;
  if (onWorkshop() && !WS_OK.has(a)) return;
  e.preventDefault(); ACTIONS[a][1]();
}

/* ---------- overlays: outline and help ---------- */
function toggleOverlay(id) { const o = $(id), open = o.hidden; closeOverlays(); o.hidden = !open; }
function closeOverlays() { let was = false; for (const id of ['outline', 'help']) { if (!$(id).hidden) was = true; $(id).hidden = true; } return was; }
function buildOutline() {
  let html = `<div class="ol-box"><div class="ol-head">Outline <span>O or Esc to close · type a number then Enter to jump</span></div><div class="ol-cols">`;
  let sec = null;
  SLIDES.forEach((s, i) => {
    if (s.section !== sec) { if (sec !== null) html += '</div>'; sec = s.section; html += `<div class="ol-sec"><div class="ol-st">${s.section || ''}</div>`; }
    html += `<a data-i="${i}"><b>${i + 1}</b>${s.title || ''}</a>`;
  });
  $('outline').innerHTML = html + '</div></div></div>';
  $('outline').addEventListener('click', e => { const a = e.target.closest('a'); if (a) { closeOverlays(); goto(+a.dataset.i); } else if (e.target.id === 'outline') closeOverlays(); });
}
function buildHelp(keys) {
  const pretty = k => k.replace('Ctrl+', 'Ctrl + ').replace('Shift+', 'Shift + ').replace('Arrow', '').replace(/^(\w)$/, m => m.toUpperCase());
  const rows = Object.keys(ACTIONS).filter(a => keys[a] && [].concat(keys[a]).length).map(a => `<tr><td>${[].concat(keys[a]).map(k => `<kbd>${pretty(k)}</kbd>`).join(' ')}</td><td>${ACTIONS[a][0]}</td></tr>`).join('');
  $('help').innerHTML = `<div class="ol-box hp"><div class="ol-head">Keys and tools <span>? or Esc to close</span></div><table>${rows}
    <tr><td><kbd>1</kbd> … <kbd>${INK_COLORS.length}</kbd></td><td>pen colour, while the pen or highlighter is on</td></tr>
    <tr><td>number, <kbd>Enter</kbd></td><td>jump to that slide</td></tr><tr><td><kbd>Esc</kbd></td><td>leave the current tool or overlay</td></tr></table></div>`;
  $('help').addEventListener('click', e => { if (e.target.id === 'help') closeOverlays(); });
}

/* ---------- drawing (pen, highlighter, eraser), laser, whiteboard, blackout, zoom ---------- */
const INK_COLORS = ['#d1435b', '#1f6fb2', '#2e9b4f', '#e2711d', '#7d4fb5', '#1d1d1f'];
// Strokes live in stage coordinates on slides (so they survive resizing and zoom) and in page coordinates on the workshop.
const Ink = {
  strokes: {}, cv: null, cx: null,
  key() { return onWorkshop() ? 'ws' : (Tools.boardOn ? 'board:' : 'slide:') + Deck.i; },
  list() { return this.strokes[this.key()] ||= []; },
  toLocal(x, y) {
    if (onWorkshop()) return [x + scrollX, y + scrollY];
    const r = $('stage').getBoundingClientRect(), k = r.width / SW; return [(x - r.left) / k, (y - r.top) / k];
  },
  toScreen() {
    if (onWorkshop()) return { k: 1, ox: -scrollX, oy: -scrollY };
    const r = $('stage').getBoundingClientRect(); return { k: r.width / SW, ox: r.left, oy: r.top };
  },
  resize() { const d = devicePixelRatio || 1; this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.cx.setTransform(d, 0, 0, d, 0, 0); this.redraw(); },
  redraw() {
    if (!this.cx) return;
    const c = this.cx, { k, ox, oy } = this.toScreen(); c.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of this.list()) {
      if (s.pts.length < 1) continue;
      c.globalAlpha = s.hl ? .38 : 1; c.strokeStyle = s.color; c.lineWidth = s.w * k; c.lineCap = c.lineJoin = 'round';
      c.beginPath(); s.pts.forEach(([x, y], i) => { const X = ox + x * k, Y = oy + y * k; i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
      if (s.pts.length === 1) c.lineTo(ox + s.pts[0][0] * k + .1, oy + s.pts[0][1] * k);
      c.stroke();
    }
    c.globalAlpha = 1;
  },
  clear() { this.strokes[this.key()] = []; this.redraw(); flash('drawings cleared'); },
  erase(p) { const L = this.list(), r = 22; this.strokes[this.key()] = L.filter(s => !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < r)); this.redraw(); }
};
const Tools = {
  mode: null, color: INK_COLORS[0], boardOn: false, blackOn: false, zoomed: false, trail: [],
  set(m) {
    if (this.mode === m) m = null;
    if (m !== 'zoom' && this.zoomed) this.unzoom();
    this.mode = m; document.body.dataset.tool = m || '';
    $('ink').style.pointerEvents = m === 'pen' || m === 'highlighter' || m === 'eraser' ? 'auto' : 'none';
    $('laser').hidden = m !== 'laser';
    document.querySelectorAll('#chrome [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === m));
    flash(m ? m + ' on' : 'tool off'); this.paint();
  },
  paint() { const sw = $('tl-color'); if (sw) sw.style.background = this.color; },
  escape() {
    if (this.zoomed) { this.unzoom(); return true; }
    if (this.boardOn) { this.board(false); return true; }
    if (this.mode) { this.set(null); return true; }
    return false;
  },
  leaveSlide() { if (this.zoomed) this.unzoom(); if (this.boardOn) this.board(false); },
  board(on = !this.boardOn) {
    this.boardOn = on; $('board').hidden = !on; document.querySelectorAll('#chrome [data-act="whiteboard"]').forEach(b => b.classList.toggle('on', on));
    if (on && !this.mode) this.set('pen');
    Ink.redraw(); flash(on ? 'whiteboard' : 'whiteboard off');
  },
  black(on = !this.blackOn) { this.blackOn = on; $('black').hidden = !on; },
  zoomAt(x, y) { const v = $('viewport'); v.style.transformOrigin = `${x}px ${y}px`; v.style.transform = 'scale(2.2)'; this.zoomed = true; this.follow(); },
  unzoom() { const v = $('viewport'); v.style.transform = ''; this.zoomed = false; this.follow(); },
  follow() { const t0 = performance.now(); const f = now => { Ink.redraw(); if (now - t0 < 500) requestAnimationFrame(f); }; requestAnimationFrame(f); }
};
function initTools() {
  const ink = $('ink'); Ink.cv = ink; Ink.cx = ink.getContext('2d'); Ink.resize();
  addEventListener('resize', () => Ink.resize());
  addEventListener('scroll', () => { if (onWorkshop()) Ink.redraw(); }, { passive: true });
  let cur = null;
  ink.addEventListener('pointerdown', e => {
    const p = Ink.toLocal(e.clientX, e.clientY); ink.setPointerCapture(e.pointerId);
    if (Tools.mode === 'eraser') { Ink.erase(p); cur = { erase: true }; return; }
    // Widths are in stage units on slides and in CSS pixels on the workshop page.
    const hl = Tools.mode === 'highlighter';
    cur = { pts: [p], color: hl ? C.gold : Tools.color, w: onWorkshop() ? (hl ? 18 : 3.5) : (hl ? 24 : 5), hl };
    Ink.list().push(cur); Ink.redraw();
  });
  ink.addEventListener('pointermove', e => {
    if (!cur) return; const p = Ink.toLocal(e.clientX, e.clientY);
    if (cur.erase) Ink.erase(p); else { cur.pts.push(p); Ink.redraw(); }
  });
  const end = () => { cur = null; };
  ink.addEventListener('pointerup', end); ink.addEventListener('pointercancel', end);
  // Laser: a dot with a short fading trail.
  const tr = $('trail'), tc = tr.getContext('2d'), las = $('laser');
  const sizeTrail = () => { const d = devicePixelRatio || 1; tr.width = innerWidth * d; tr.height = innerHeight * d; tc.setTransform(d, 0, 0, d, 0, 0); };
  sizeTrail(); addEventListener('resize', sizeTrail);
  addEventListener('pointermove', e => {
    document.body.classList.remove('idle'); clearTimeout(Tools._idle);
    if (DECK.controls.autoHide !== false) Tools._idle = setTimeout(() => document.body.classList.add('idle'), 2500);
    if (Tools.mode !== 'laser') return;
    las.style.left = e.clientX + 'px'; las.style.top = e.clientY + 'px';
    Tools.trail.push([e.clientX, e.clientY, performance.now()]);
    if (!Tools._raf) Tools._raf = requestAnimationFrame(function f(now) {
      Tools.trail = Tools.trail.filter(p => now - p[2] < 320);
      tc.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 1; i < Tools.trail.length; i++) {
        const [x0, y0] = Tools.trail[i - 1], [x1, y1, t] = Tools.trail[i], a = 1 - (now - t) / 320;
        tc.strokeStyle = `rgba(230,40,40,${a * .55})`; tc.lineWidth = 6 * a + 1; tc.lineCap = 'round';
        tc.beginPath(); tc.moveTo(x0, y0); tc.lineTo(x1, y1); tc.stroke();
      }
      Tools._raf = Tools.trail.length ? requestAnimationFrame(f) : 0;
    });
  });
  // Zoom mode: a click zooms in around that point, the next click zooms back out.
  $('viewport').addEventListener('click', e => { if (Tools.mode !== 'zoom') return; Tools.zoomed ? Tools.unzoom() : Tools.zoomAt(e.clientX, e.clientY); });
  $('black').addEventListener('click', () => Tools.black(false));
}

/* ---------- presenter window ---------- */
function mdInline(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}
// Small Markdown renderer for notes: headings, nested lists, tables, code fences, paragraphs.
function md2html(md) {
  const L = md.replace(/\r/g, '').split('\n'); let out = '', i = 0;
  const stack = []; const closeTo = d => { while (stack.length > d) out += `</li></${stack.pop().t}>`; };
  while (i < L.length) {
    const l = L[i];
    if (/^```/.test(l)) { closeTo(0); let code = ''; i++; while (i < L.length && !/^```/.test(L[i])) code += L[i++] + '\n'; i++; out += `<pre><code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>`; continue; }
    if (/^\s*\|/.test(l)) {
      closeTo(0); const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => mdInline(c.trim()));
      const body = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      out += '<table>' + body.map((r, k) => `<tr>${cells(r).map(c => k ? `<td>${c}</td>` : `<th>${c}</th>`).join('')}</tr>`).join('') + '</table>'; continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)/); if (h) { closeTo(0); out += `<h${h[1].length + 1}>${mdInline(h[2])}</h${h[1].length + 1}>`; i++; continue; }
    const li = l.match(/^(\s*)(\d+\.|[-*])\s+(.*)/);
    if (li) {
      const d = Math.floor(li[1].length / 2) + 1, t = /\d/.test(li[2]) ? 'ol' : 'ul';
      if (stack.length < d) { while (stack.length < d) { out += `<${t}><li>`; stack.push({ t }); } }
      else { closeTo(d); out += '</li><li>'; }
      out += mdInline(li[3]); i++; continue;
    }
    if (!l.trim()) { closeTo(0); i++; continue; }
    if (stack.length && /^\s+\S/.test(l)) { out += ' ' + mdInline(l.trim()); i++; continue; }
    closeTo(0); let p = l; i++; while (i < L.length && L[i].trim() && !/^(#|\s*[-*]\s|\s*\d+\.\s|```|\s*\|)/.test(L[i])) p += ' ' + L[i++];
    out += `<p>${mdInline(p)}</p>`;
  }
  closeTo(0); return out;
}
const Notes = {
  bySlide: {}, general: [],
  load() {
    const el = $('deck-notes'); const md = el ? el.textContent : '';
    const parts = md.split(/^(?=## )/m);
    for (const p of parts) {
      const m = p.match(/^## Slide (\d+)\b[^\n]*\n?/);
      if (m) this.bySlide[+m[1]] = { head: p.split('\n')[0].slice(3), body: p.slice(m[0].length) };
      else if (p.trim()) this.general.push(p);
    }
  },
  forSlide(i) { const n = this.bySlide[i + 1]; if (n) return n; const s = SLIDES[i]; return s && s.notes ? { head: `Slide ${i + 1}. ${s.title || ''}`, body: s.notes } : null; }
};
const Presenter = {
  win: null, t0: 0,
  open() {
    if (this.win && !this.win.closed) { this.win.focus(); return; }
    const w = window.open('', 'deck-presenter', 'width=1100,height=780');
    if (!w) { flash('allow pop-ups to open the presenter window'); return; }
    this.win = w; if (!this.t0) this.t0 = Date.now();
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Presenter: ${DECK.title}</title><style>${PRESENTER_CSS}</style></head><body>
      <header><div><b id="p-num"></b><span id="p-title"></span></div><div class="r"><span id="p-step"></span><span id="p-timer" title="click to reset">0:00</span><span id="p-clock"></span></div></header>
      <main><section id="p-notes"></section><aside><div class="lab">next</div><div id="p-next"></div><div class="lab">all notes</div><button id="p-all">show general notes</button><div id="p-gen" hidden></div>
      <div class="lab">controls</div><div class="ctl"><button data-a="prev">‹ step</button><button data-a="next">step ›</button><button data-a="prevSlide">‹ slide</button><button data-a="nextSlide">slide ›</button></div>
      <p class="hint">Keys typed here control the slides too.</p></aside></main></body></html>`);
    w.document.close();
    w.addEventListener('keydown', onKey);
    w.document.getElementById('p-timer').onclick = () => { this.t0 = Date.now(); };
    w.document.getElementById('p-all').onclick = () => { const g = w.document.getElementById('p-gen'); g.hidden = !g.hidden; };
    w.document.getElementById('p-gen').innerHTML = Notes.general.map(md2html).join('');
    w.document.querySelectorAll('.ctl button').forEach(b => b.onclick = () => ACTIONS[b.dataset.a][1]());
    clearInterval(this._tick); this._tick = setInterval(() => this.tick(), 1000);
    this.update(); this.tick();
  },
  tick() {
    if (!this.win || this.win.closed) { clearInterval(this._tick); return; }
    const d = this.win.document, s = Math.floor((Date.now() - this.t0) / 1000);
    d.getElementById('p-timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    d.getElementById('p-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  update() {
    if (!this.win || this.win.closed) return;
    const d = this.win.document, i = Deck.i, sl = SLIDES[i]; if (!sl) return;
    d.getElementById('p-num').textContent = `${i + 1} / ${SLIDES.length}`;
    d.getElementById('p-title').textContent = sl.title || '';
    d.getElementById('p-step').textContent = sl.workshop ? 'workshop' : `step ${Deck.step} / ${Deck.steps.length}`;
    const n = Notes.forSlide(i), box = d.getElementById('p-notes');
    if (box.dataset.slide !== String(i)) {
      box.dataset.slide = i;
      box.innerHTML = n ? `<h1>${mdInline(n.head)}</h1>` + md2html(n.body) : '<p class="none">No notes for this slide.</p>';
      // A list item that starts with [n] belongs to step n, and so do the items after it until the next marker.
      let cur = 0;
      box.querySelectorAll('li').forEach(li => {
        const m = li.innerHTML.match(/^\s*\[(\d+)\]\s*/);
        if (m) { cur = +m[1]; li.innerHTML = `<span class="sb">${m[1]}</span>` + li.innerHTML.slice(m[0].length); }
        if (li.parentElement.closest('li')) return;
        li.dataset.s = cur;
      });
      box.scrollTop = 0;
    }
    box.querySelectorAll('li[data-s]').forEach(li => { const s = +li.dataset.s; li.className = s === Deck.step ? 'now' : s > Deck.step ? 'later' : ''; });
    const now = box.querySelector('li.now'); if (now) now.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const nx = SLIDES[i + 1]; d.getElementById('p-next').textContent = Deck.step < Deck.steps.length ? `step ${Deck.step + 1} of this slide` : nx ? `${i + 2}. ${nx.title || ''}` : 'end';
  }
};
const PRESENTER_CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 Inter,system-ui,sans-serif;color:#1d1d1f;background:#fff}
header{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #e6e9ee;position:sticky;top:0;background:#fff}
header b{color:#1f6fb2;margin-right:12px}header .r{display:flex;gap:18px;color:#5b616b;font-variant-numeric:tabular-nums}#p-timer{cursor:pointer;font-weight:600;color:#1d1d1f}
main{display:grid;grid-template-columns:1fr 280px;gap:20px;padding:16px 20px;height:calc(100vh - 54px)}
#p-notes{overflow:auto;padding-right:8px;font-size:19px}#p-notes h1{font-size:22px;margin:0 0 10px}#p-notes h3,#p-notes h4{margin:14px 0 6px}
#p-notes li{margin:5px 0;padding:2px 6px;border-radius:6px}#p-notes li.now{background:#eaf2fb;box-shadow:inset 3px 0 #1f6fb2}#p-notes li.later{color:#9aa0a8}
.sb{display:inline-block;min-width:22px;height:22px;border-radius:11px;background:#1f6fb2;color:#fff;font-size:13px;text-align:center;line-height:22px;margin-right:8px}
li.later .sb{background:#c9cdd3}code{font:14px 'JetBrains Mono',monospace;background:#f3f5f7;padding:1px 4px;border-radius:4px}pre{background:#f7f8fa;padding:10px;border-radius:8px;overflow:auto}
table{border-collapse:collapse;margin:8px 0}td,th{border-bottom:1px solid #e6e9ee;padding:4px 8px;text-align:left;font-size:15px}
aside{border-left:1px solid #e6e9ee;padding-left:16px;overflow:auto}.lab{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7d838c;margin:14px 0 4px}
#p-next{font-size:17px}button{font:14px Inter,sans-serif;border:1px solid #cfdcea;background:#fff;color:#1f6fb2;border-radius:6px;padding:5px 10px;cursor:pointer;margin:2px}
.ctl{display:grid;grid-template-columns:1fr 1fr;gap:4px}#p-gen{font-size:14px}.hint,.none{color:#7d838c;font-size:13px}`;

/* ---------- chrome ---------- */
const ICON = {
  laser: '<circle cx="8" cy="8" r="2.6" fill="currentColor"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  pen: '<path d="M3 13l.8-3.2L10.6 3l2.4 2.4-6.8 6.8z"/>', highlighter: '<path d="M5 11l5.5-5.5 2 2L7 13H5z"/><path d="M3 15h10" opacity=".5"/>',
  eraser: '<path d="M2.5 10.5l6-6 4 4-4.5 4.5H5z"/><path d="M8 15h6"/>', clear: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.8 9h5.4l.8-9"/>',
  whiteboard: '<rect x="2" y="2.5" width="12" height="8.5" rx="1"/><path d="M6 14h4M8 11v3"/>', zoom: '<circle cx="7" cy="7" r="4"/><path d="M10 10l4 4M5.5 7h3M7 5.5v3"/>',
  presenter: '<rect x="2" y="2.5" width="12" height="9" rx="1"/><path d="M4.5 5.5h7M4.5 8h4.5"/>', fullscreen: '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>',
  help: '<path d="M6 6a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.6V10"/><circle cx="8" cy="12.6" r=".6" fill="currentColor"/>'
};
function buildChrome() {
  const groups = DECK.controls.buttons || ['player', 'tools', 'outline', 'nav'];
  const tb = (act, tool) => `<button ${tool ? `data-tool="${act}"` : `data-act="${act}"`} title="${ACTIONS[act][0]}"><svg viewBox="0 0 16 16">${ICON[act]}</svg></button>`;
  const parts = {
    player: `<div class="player"><button id="pl-rev" title="play the last step backwards"><svg viewBox="0 0 16 16" class="f"><path d="M8 3 2 8l6 5zM14 3 8 8l6 5z"/></svg></button><button id="pl-back" title="step back"><svg viewBox="0 0 16 16" class="f"><path d="M3 3h2v10H3zM13 3 6 8l7 5z"/></svg></button><button id="pl-next" title="next step"><svg viewBox="0 0 16 16" class="f"><path d="M4 3l8 5-8 5z"/></svg></button><button id="pl-speed" title="animation speed">1×</button></div>`,
    tools: `<div class="tools">${tb('laser', 1)}${tb('pen', 1)}<button id="tl-color" title="pen colour (or keys 1 to ${INK_COLORS.length})"></button>${tb('highlighter', 1)}${tb('eraser', 1)}${tb('clear')}${tb('whiteboard')}${tb('zoom', 1)}${tb('presenter')}${tb('fullscreen')}${tb('help')}</div>`,
    outline: `<button id="nav-ol" title="outline">outline</button>`,
    nav: `<button id="nav-prev" title="previous slide">&#8249;</button><span id="ctr"></span><button id="nav-next" title="next slide">&#8250;</button>`
  };
  const ch = document.createElement('div'); ch.id = 'chrome';
  ch.innerHTML = `<span id="stepdots"></span>` + groups.map(g => parts[g] || '').join('');
  if (!groups.includes('nav')) ch.innerHTML += '<span id="ctr" hidden></span>';
  if (!groups.includes('player')) ch.innerHTML += '<span hidden><b id="pl-speed"></b></span>';
  document.body.append(ch);
  for (const [id, html] of [['prog', ''], ['toast', ''], ['outline', ''], ['help', '']]) { const d = document.createElement('div'); d.id = id; d.innerHTML = html; if (id === 'outline' || id === 'help') d.hidden = true; document.body.append(d); }
  for (const [id, tag] of [['board', 'div'], ['ink', 'canvas'], ['trail', 'canvas'], ['laser', 'div'], ['black', 'div']]) { const d = document.createElement(tag); d.id = id; if (id === 'board' || id === 'laser' || id === 'black') d.hidden = true; document.body.append(d); }
  const on = (id, f) => { const b = $(id); if (b) b.onclick = f; };
  on('pl-rev', reverseStep); on('pl-back', stepBack); on('pl-next', next); on('pl-speed', cycleSpeed);
  on('nav-prev', slidePrev); on('nav-next', slideNext); on('nav-ol', () => toggleOverlay('outline'));
  on('tl-color', () => { Tools.color = INK_COLORS[(INK_COLORS.indexOf(Tools.color) + 1) % INK_COLORS.length]; Tools.paint(); if (Tools.mode !== 'pen' && Tools.mode !== 'highlighter') Tools.set('pen'); });
  ch.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => Tools.set(b.dataset.tool));
  ch.querySelectorAll('[data-act]').forEach(b => b.onclick = () => ACTIONS[b.dataset.act][1]());
  Tools.paint();
  if (DECK.controls.hidden) document.body.classList.add('nochrome');
}

function startDeck() {
  if (DECK.title) document.title = DECK.title;
  const keys = buildKeymap();
  buildChrome(); fit(); buildOutline(); buildHelp(keys); Notes.load(); initTools();
  addEventListener('resize', fit);
  document.addEventListener('keydown', onKey);
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) {
    const box = document.createElement('pre'); box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;color:#c00;font:12px monospace;background:#fff8;max-width:90vw;white-space:pre-wrap';
    document.body.appendChild(box);
    const ce = console.error; console.error = (...a) => { box.textContent += a.map(x => x && x.stack || String(x)).join(' ') + '\n'; ce(...a); };
    addEventListener('error', e => { box.textContent += (e.error && e.error.stack || e.message) + '\n'; });
  }
  const tag = (location.hash || '').slice(1);
  const h = tag === 'workshop' ? SLIDES.findIndex(x => x.workshop) + 1 : parseInt(tag) || 1;
  const start = () => goto(h - 1, q.has('end') ? Infinity : 1, { instant: q.has('end') });
  // Pills are sized from measured text, so fonts must be loaded before the first build.
  const fl = document.fonts ? Promise.all(['28px KaTeX_Main', 'italic 28px KaTeX_Main', '16px Inter', '600 16px Inter', '20px JetBrains Mono'].map(f => document.fonts.load(f).catch(() => { }))) : Promise.resolve();
  Promise.race([fl, new Promise(r => setTimeout(r, 2500))]).then(() => setTimeout(start, 30));
}
