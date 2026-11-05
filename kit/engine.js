'use strict';
/* Animation engine: a stepped timeline of tweens over one SVG layer and one HTML/KaTeX layer
   on a fixed 1600x900 stage, plus three.js scenes for 3D. player.js drives the slides. */

const SW = 1600, SH = 900, NS = 'http://www.w3.org/2000/svg';
const R = String.raw;
const C = {
  ink: '#1d1d1f', blue: '#1f6fb2', lblue: '#a9cdee', teal: '#0f9d8a', lteal: '#a8e0d6',
  green: '#2e9b4f', lgreen: '#bfe5c9', red: '#d1435b', lred: '#f4c0c8', orange: '#e2711d', lorange: '#f8d2b0',
  gold: '#e0a800', dgold: '#a87d00', purple: '#7d4fb5', lpurple: '#d9c8f0', pink: '#c43d86',
  grey: '#7d838c', lgrey: '#c9cdd3', faint: '#f3f5f7', grid: '#e6e9ee', white: '#ffffff'
};
// Categorical palette for groups, series and clusters, always in this order.
const PALETTE = [C.blue, C.orange, C.green, C.purple, C.teal, C.red, C.pink, C.dgold, C.grey];
const KCOL = { cblue: C.blue, cteal: C.teal, cred: C.red, cgreen: C.green, corange: C.orange, cpurple: C.purple, cgold: C.dgold, cgrey: C.grey, cpink: C.pink };
// Deck shorthands: texMacros({ vc: R`\cblue{v_c}` }) makes \vc usable in every formula on every slide.
const KSYM = {};
let _ksymRe = null;
function texMacros(map) {
  Object.assign(KSYM, map);
  _ksymRe = new RegExp('\\\\(' + Object.keys(KSYM).sort((a, b) => b.length - a.length).join('|') + ')(?![a-zA-Z])', 'g');
}
// Colour shortcuts are expanded here rather than as KaTeX macros: a hex colour inside a macro body would be read as parameter #1.
function kprep(l) {
  if (_ksymRe) l = l.replace(_ksymRe, (_, k) => '{' + KSYM[k] + '}');
  return l.replace(/\\(cblue|cteal|cred|cgreen|corange|cpurple|cgold|cgrey|cpink)\{/g, (_, k) => R`\textcolor{${KCOL[k]}}{`);
}
const KOPT = { throwOnError: false, trust: true, strict: 'ignore' };
function krender(l, el, o = {}) { katex.render(kprep(l), el, { ...KOPT, ...o }); }
const T = (l) => katex.renderToString(kprep(l), KOPT);

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sigmoid = x => 1 / (1 + Math.exp(-x));
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = a => Math.sqrt(dot(a, a));
const fmt = (v, d = 2) => (v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -d) ? '−' : '') + Math.abs(v).toFixed(d);
const commas = n => Math.round(n).toLocaleString('en-US');
function softmax(z) { const m = Math.max(...z); const e = z.map(v => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(c1, c2, t) { const a = hex2rgb(c1), b = hex2rgb(c2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); }
function diverge(v) { return v >= 0 ? mix('#ffffff', C.blue, clamp(v)) : mix('#ffffff', C.red, clamp(-v)); }
function arr(x) { return (Array.isArray(x) ? x.flat(Infinity) : [x]).filter(Boolean); }

/* ---------- tween core ---------- */
const E = {
  smooth: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  linear: t => t, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t,
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  wave: t => Math.sin(Math.PI * t)
};
// speed scales every tween; rec, when set, collects the tweens of the running step so it can be played backwards.
const Anim = { skip: false, tw: new Set(), raf: 0, speed: 1, rec: null, rec0: 0 };
function _tick(now) {
  Anim.raf = 0;
  for (const w of [...Anim.tw]) {
    const p = clamp((now - w.t0) / w.d);
    try { w.fn(w.e(p)); } catch (err) { console.error(err); }
    if (p >= 1) { Anim.tw.delete(w); w.res(); }
  }
  if (Anim.tw.size) Anim.raf = requestAnimationFrame(_tick);
}
function tween(dur, fn, e = E.smooth) {
  if (Anim.skip || dur <= 0) { try { fn(e(1)); } catch (err) { console.error(err); } return Promise.resolve(); }
  if (Anim.rec) Anim.rec.push({ fn, e, d: dur * 1000, start: (performance.now() - Anim.rec0) * Anim.speed });
  return new Promise(res => {
    Anim.tw.add({ d: dur * 1000 / Anim.speed, fn, e, t0: performance.now(), res });
    if (!Anim.raf) Anim.raf = requestAnimationFrame(_tick);
  });
}
function finishAll() { for (const w of [...Anim.tw]) { try { w.fn(w.e(1)); } catch (_) { } Anim.tw.delete(w); w.res(); } }
const wait = s => tween(s, () => { }, E.linear);
const all = (...p) => Promise.all(p.flat(Infinity));

/* ---------- animations ---------- */
function show(...t) { arr(t).forEach(e => e.style.opacity = e._op ?? 1); }
function hide(...t) { arr(t).forEach(e => e.style.opacity = 0); }
function stagger(n, lag, t) { return i => n > 1 && lag ? E.smooth(clamp((t - lag * i / (n - 1)) / (1 - lag))) : E.smooth(t); }
function fadeIn(target, dur = .6, o = {}) {
  const els = arr(target); if (!els.length) return Promise.resolve();
  const [dx, dy] = o.shift || [0, 0];
  els.forEach(e => { e.style.opacity = 0; e._fx = e._tx || 0; e._fy = e._ty || 0; });
  return tween(dur, t => {
    const p = stagger(els.length, o.lag || 0, t);
    els.forEach((e, i) => {
      const q = p(i); e.style.opacity = (e._op ?? 1) * q;
      if (dx || dy) e.style.translate = `${e._fx + dx * (1 - q)}px ${e._fy + dy * (1 - q)}px`;
    });
  }, E.linear);
}
function fadeOut(target, dur = .5, o = {}) {
  const els = arr(target); if (!els.length) return Promise.resolve();
  const st = els.map(e => parseFloat(e.style.opacity === '' ? 1 : e.style.opacity));
  const [dx, dy] = o.shift || [0, 0];
  return tween(dur, t => {
    const p = stagger(els.length, o.lag || 0, t);
    els.forEach((e, i) => {
      const q = p(i); e.style.opacity = st[i] * (1 - q);
      if (dx || dy) e.style.translate = `${(e._tx || 0) + dx * q}px ${(e._ty || 0) + dy * q}px`;
    });
  }, E.linear).then(() => { if (o.remove) els.forEach(e => e.remove()); });
}
function opacityT(target, to, dur = .4) {
  const els = arr(target); const st = els.map(e => parseFloat(e.style.opacity === '' ? 1 : e.style.opacity));
  return tween(dur, t => els.forEach((e, i) => e.style.opacity = lerp(st[i], to, t)));
}
function setT(e, x, y) { e._tx = x; e._ty = y; e.style.translate = `${x}px ${y}px`; }
function shift(target, dx, dy, dur = .6, ease = E.smooth) {
  const els = arr(target); const st = els.map(e => [e._tx || 0, e._ty || 0]);
  return tween(dur, t => els.forEach((e, i) => setT(e, st[i][0] + dx * t, st[i][1] + dy * t)), ease);
}
function moveText(e, x, y, dur = .6, ease = E.smooth) {
  const x0 = e._x, y0 = e._y;
  return tween(dur, t => { e._x = lerp(x0, x, t); e._y = lerp(y0, y, t); e.style.left = e._x + 'px'; e.style.top = e._y + 'px'; }, ease);
}
const GEOM = 'path,line,circle,rect,polyline,polygon,ellipse';
function create(target, dur = 1, o = {}) {
  const top = arr(target);
  const els = top.flatMap(e => e.tagName === 'g' ? [...e.querySelectorAll(GEOM)] : (e instanceof SVGElement ? [e] : []));
  const html = top.filter(e => !(e instanceof SVGElement));
  top.forEach(e => { if (e.tagName === 'g') e.style.opacity = e._op ?? 1; });
  const info = els.map(e => {
    let L = 1; try { L = e.getTotalLength() || 1; } catch (_) { }
    const fo = parseFloat(e.getAttribute('fill-opacity') ?? 1);
    e.style.opacity = e._op ?? (e.style.opacity === '0' ? 1 : (e.style.opacity || 1));
    e.style.strokeDasharray = L + 1; e.style.strokeDashoffset = L + 1; e.style.fillOpacity = 0;
    return { e, L: L + 1, fo };
  });
  const lag = o.lag ?? (info.length > 1 ? .2 : 0);
  const pw = [write(html, dur)];
  pw.push(tween(dur, t => {
    const n = info.length;
    info.forEach((it, i) => {
      const s0 = n > 1 ? lag * i / (n - 1) : 0;
      const p = E.smooth(clamp((t - s0) / (1 - lag || 1)));
      if (t >= 1) { it.e.style.strokeDasharray = ''; it.e.style.strokeDashoffset = ''; it.e.style.fillOpacity = ''; return; }
      it.e.style.strokeDasharray = it.L; it.e.style.strokeDashoffset = it.L * (1 - p);
      it.e.style.fillOpacity = it.fo * clamp((p - .55) / .45);
    });
  }, E.linear));
  return all(pw);
}
function write(target, dur = 1) {
  const els = arr(target); if (!els.length) return Promise.resolve();
  const svg = els.filter(e => e instanceof SVGElement), html = els.filter(e => !(e instanceof SVGElement));
  const ps = [];
  if (svg.length) ps.push(create(svg, dur));
  if (html.length) {
    html.forEach(e => { e.style.opacity = e._op ?? 1; e.style.clipPath = 'inset(-40% 100% -40% -4%)'; });
    ps.push(tween(dur, t => html.forEach(e => e.style.clipPath = t >= 1 ? '' : `inset(-40% ${(1 - t) * 104 - 4}% -40% -4%)`), E.linear));
  }
  return all(ps);
}
function grow(target, dur = .6, o = {}) {
  const els = arr(target);
  els.forEach(e => { if (e instanceof SVGElement) { e.style.transformBox = 'fill-box'; e.style.transformOrigin = o.origin || 'center'; } e.style.opacity = e._op ?? 1; e.style.scale = 0; });
  return tween(dur, t => { const p = stagger(els.length, o.lag || 0, t); els.forEach((e, i) => e.style.scale = t >= 1 ? '' : Math.max(0, o.back === false ? p(i) : E.back(clamp((t - (o.lag || 0) * i / Math.max(1, els.length - 1)) / (1 - (o.lag || 0)))))); }, E.linear);
}
function indicate(target, o = {}) {
  const els = arr(target); const sc = o.scale ?? 1.18;
  els.forEach(e => { if (e instanceof SVGElement) { e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center'; } });
  const cols = els.map(e => e instanceof SVGElement ? null : (e._color || C.ink));
  return tween(o.dur ?? .8, t => els.forEach((e, i) => {
    e.style.scale = 1 + (sc - 1) * t;
    if (cols[i] && o.color) e.style.color = mix(cols[i], o.color, t);
  }), E.wave).then(() => els.forEach((e, i) => { e.style.scale = ''; if (cols[i]) e.style.color = cols[i]; }));
}
function colorT(el, prop, to, dur = .4) {
  const isH = !(el instanceof SVGElement);
  const from = isH ? (el._color || C.ink) : el.getAttribute(prop);
  const apply = c => { if (isH) { el.style.color = c; el._color = c; } else el.setAttribute(prop, c); };
  if (!from || from[0] !== '#' || !to || to[0] !== '#') { apply(to); return Promise.resolve(); }
  return tween(dur, t => apply(mix(from, to, t)));
}
function attrT(el, obj, dur = .6, ease = E.smooth) {
  const ks = Object.keys(obj);
  const fr = ks.map(k => Array.isArray(obj[k]) ? obj[k][0] : parseFloat(el.getAttribute(k)));
  const to = ks.map(k => Array.isArray(obj[k]) ? obj[k][1] : obj[k]);
  return tween(dur, t => ks.forEach((k, i) => el.setAttribute(k, lerp(fr[i], to[i], t))), ease);
}
function countTo(el, a, b, dur = 1, f = v => commas(v)) { return tween(dur, t => el.textContent = f(lerp(a, b, t))); }
function arrowTo(a, x1, y1, x2, y2, dur = .6, ease = E.smooth) {
  const [p, q, r, s] = a.p; return tween(dur, t => a.set(lerp(p, x1, t), lerp(q, y1, t), lerp(r, x2, t), lerp(s, y2, t)), ease);
}
function tint(it, col, dur = .35, o = {}) {
  const fillTo = col ? (o.solid ? col : mix(col, '#ffffff', .8)) : '#ffffff';
  const strokeTo = col || C.lgrey;
  const txt = col && o.solid ? '#ffffff' : (o.text || C.ink);
  return all(colorT(it.box, 'fill', fillTo, dur), colorT(it.box, 'stroke', strokeTo, dur), colorT(it.t, 'color', txt, dur));
}
async function swapText(el, html, dur = .4) { await fadeOut(el, dur / 2); el.innerHTML = html; await fadeIn(el, dur / 2); }
async function swapTex(el, l, dur = .5) { await fadeOut(el, dur / 2); krender(l, el); await fadeIn(el, dur / 2); }
function pulse(s, pts, o = {}) {
  const c = s.circle(pts[0][0], pts[0][1], o.r || 6, { fill: o.color || C.blue, show: true });
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  return tween(o.dur || .8, t => {
    let d = t * L, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const f = seg[i] ? d / seg[i] : 0;
    c.setAttribute('cx', lerp(pts[i][0], pts[i + 1][0], f)); c.setAttribute('cy', lerp(pts[i][1], pts[i + 1][1], f));
    c.style.opacity = t < .85 ? 1 : (1 - t) / .15;
  }, o.ease || E.smooth).then(() => c.remove());
}

/* ---------- scene ---------- */
function svgEl(tag, a = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
let stageScale = 1, _uid = 0;

class Scene {
  constructor(root) {
    this.root = root; this.alive = true; this.disposers = [];
    this.svg = svgEl('svg', { class: 'layer', width: SW, height: SH, viewBox: `0 0 ${SW} ${SH}` });
    root.appendChild(this.svg);
    this.svgDefs = svgEl('defs', {}, this.svg);
    this.hl = document.createElement('div'); this.hl.className = 'hl'; root.appendChild(this.hl);
  }
  dispose() { this.alive = false; this.disposers.forEach(d => { try { d(); } catch (e) { console.error(e); } }); this.root.remove(); }
  loop(fn) {
    let last = performance.now(), id;
    const f = now => { if (!this.alive) return; const dt = Math.min(.05, (now - last) / 1000) * Anim.speed; last = now; if (fn(dt, now) === false) return; id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f); this.disposers.push(() => cancelAnimationFrame(id));
  }
  _vis(e, o, p) { e._op = o.op ?? 1; const hidden = o.show ? false : (o.hidden ?? (p === this.svg || p === this.hl)); e.style.opacity = hidden ? 0 : e._op; return e; }
  g(o = {}) { const p = o.parent || this.svg; return this._vis(svgEl('g', {}, p), o, p); }
  _sv(tag, a, o, defStroke) {
    const p = o.parent || this.svg; const e = svgEl(tag, a, p);
    const st = o.stroke === undefined ? defStroke : o.stroke;
    if (st) { e.setAttribute('stroke', st); e.setAttribute('stroke-width', o.width ?? 2); } else e.setAttribute('stroke', 'none');
    e.setAttribute('fill', o.fill ?? 'none');
    if (o.fillOp != null) e.setAttribute('fill-opacity', o.fillOp);
    if (o.dash) e.setAttribute('stroke-dasharray', o.dash);
    e.setAttribute('stroke-linecap', 'round'); e.setAttribute('stroke-linejoin', 'round');
    if (o.clip) e.setAttribute('clip-path', `url(#${o.clip})`);
    return this._vis(e, o, p);
  }
  line(x1, y1, x2, y2, o = {}) { return this._sv('line', { x1, y1, x2, y2 }, o, C.ink); }
  circle(cx, cy, r, o = {}) { return this._sv('circle', { cx, cy, r }, o, o.fill ? null : C.ink); }
  rect(x, y, w, h, o = {}) { return this._sv('rect', { x, y, width: w, height: h, rx: o.rx ?? 0 }, o, o.fill ? null : C.ink); }
  path(d, o = {}) { return this._sv('path', { d }, o, C.ink); }
  poly(pts, o = {}) { return this._sv(o.closed ? 'polygon' : 'polyline', { points: pts.map(p => p.join(',')).join(' ') }, o, o.fill && o.closed ? null : C.ink); }
  arrow(x1, y1, x2, y2, o = {}) {
    const g = this.g(o); const col = o.color || C.ink, w = o.width ?? 3, hl = o.head ?? (w * 3.2 + 8);
    const ln = svgEl('line', { stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
    if (o.dash) ln.setAttribute('stroke-dasharray', o.dash);
    const hd = svgEl('polygon', { fill: col, stroke: col, 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
    g.line = ln; g.headEl = hd;
    g.set = (a, b, c, d) => {
      g.p = [a, b, c, d]; const dx = c - a, dy = d - b, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L;
      const h = Math.min(hl, L * .5), bx = c - ux * h, by = d - uy * h, hw = h * .42;
      ln.setAttribute('x1', a); ln.setAttribute('y1', b); ln.setAttribute('x2', bx + ux * .5); ln.setAttribute('y2', by + uy * .5);
      hd.setAttribute('points', `${c},${d} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`);
      hd.style.display = L < 2 ? 'none' : '';
    };
    g.set(x1, y1, x2, y2);
    g.setColor = c => { ln.setAttribute('stroke', c); hd.setAttribute('fill', c); hd.setAttribute('stroke', c); };
    return g;
  }
  text(x, y, content, o = {}) {
    const d = document.createElement('div');
    d.className = 'tx' + (o.sans ? ' sans' : '') + (o.mono ? ' mono' : '') + (o.cls ? ' ' + o.cls : '') + (o.w ? ' wrap' : '');
    d.style.left = x + 'px'; d.style.top = y + 'px'; d._x = x; d._y = y;
    if (o.size) d.style.fontSize = o.size + 'px';
    d._color = o.color || null; if (o.color) d.style.color = o.color;
    if (o.weight) d.style.fontWeight = o.weight;
    if (o.italic) d.style.fontStyle = 'italic';
    if (o.w) d.style.width = o.w + 'px';
    if (o.align) d.style.textAlign = o.align;
    const A = { c: '-50%,-50%', l: '0,-50%', r: '-100%,-50%', tl: '0,0', t: '-50%,0', b: '-50%,-100%', tr: '-100%,0', bl: '0,-100%', br: '-100%,-100%' };
    d.style.transform = `translate(${A[o.anchor || 'c']})`;
    if (o.tex) krender(content, d, { displayMode: !!o.display }); else d.innerHTML = content;
    const p = o.parent || this.hl; p.appendChild(d);
    return this._vis(d, o, p);
  }
  tex(x, y, l, o = {}) { return this.text(x, y, l, { ...o, tex: true }); }
  setTex(el, l) { krender(l, el); }
  title(sec, t) { this._title = [this.text(80, 64, sec, { sans: true, cls: 'sec', anchor: 'l' }), this.text(80, 112, t, { cls: 'ttl', anchor: 'l' })]; return this._title; }
  intro() { return this._title ? all(fadeIn(this._title[0], .5), write(this._title[1], .8)) : Promise.resolve(); }
  caption(html, o = {}) { return this.text(800, o.y ?? 750, html, { cls: 'cap', anchor: 'c', w: o.w ?? 1380, align: 'center', ...o }); }
  // Definitions strip along the bottom: one column per term. Reveal with s.showDefs(D, [indices]).
  defs(items) {
    const n = items.length, gap = 26, cw = (1440 - gap * (n - 1)) / n;
    const D = items.map(([t, d], i) => this.text(80 + i * (cw + gap), 796, `<span class="dt">${t}</span>${d}`, { anchor: 'tl', w: cw, cls: 'df' }));
    D.rule = this.line(80, 782, 1520, 782, { stroke: C.grid, width: 1.5 });
    return D;
  }
  showDefs(D, which) { const els = which ? which.map(i => D[i]) : D; return all(D.rule.style.opacity === '0' ? create(D.rule, .4) : null, fadeIn(els, .5, { lag: .3, shift: [0, 6] })); }
  img(x, y, w, h, src, o = {}) {
    const im = document.createElement('img'); im.src = src; im.className = 'simg';
    Object.assign(im.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    this.hl.appendChild(im); return this._vis(im, o, this.hl);
  }
  note(x, y, html, o = {}) { return this.text(x, y, html, { size: 24, color: '#3b4048', anchor: 'l', w: o.w ?? 420, ...o }); }
  bullets(x, y, items, o = {}) {
    const dy = o.dy || 60;
    return items.map((it, i) => this.text(x, y + i * dy, `<span class="bul" style="color:${o.bullet || C.blue}">■</span>${it}`, { anchor: 'l', size: o.size || 27, w: o.w ?? 640, color: o.color, cls: 'bl' }));
  }
  rectOf(el) {
    const r = el.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
    return { x: (r.left - st.left) / stageScale, y: (r.top - st.top) / stageScale, w: r.width / stageScale, h: r.height / stageScale };
  }
  brace(x1, x2, y, o = {}) {
    const up = o.dir === 'up', d = up ? -1 : 1, h = o.h || 16, m = (x1 + x2) / 2;
    const p = `M${x1},${y} Q${x1},${y + d * h * .6} ${x1 + h},${y + d * h * .6} L${m - h},${y + d * h * .6} Q${m},${y + d * h * .6} ${m},${y + d * h} Q${m},${y + d * h * .6} ${m + h},${y + d * h * .6} L${x2 - h},${y + d * h * .6} Q${x2},${y + d * h * .6} ${x2},${y}`;
    return this.path(p, { stroke: o.color || C.ink, width: o.width || 2.2 });
  }
  braceUnder(el, label, o = {}) {
    const r = this.rectOf(el), up = o.dir === 'up';
    const y = up ? r.y - 6 : r.y + r.h + 6;
    const b = this.brace(r.x + 2, r.x + r.w - 2, y, { color: o.color, dir: o.dir, h: o.h });
    const t = this.text(r.x + r.w / 2, up ? y - 26 - (o.gap || 0) : y + 28 + (o.gap || 0), label, { anchor: up ? 'b' : 't', size: o.size || 24, color: o.color || C.ink, sans: o.sans, w: o.w, align: 'center' });
    return [b, t];
  }
  clip(x, y, w, h) { const id = 'cl' + (++_uid); const cp = svgEl('clipPath', { id }, this.svgDefs); svgEl('rect', { x, y, width: w, height: h }, cp); return id; }

  axes(o) {
    const { x, y, w, h } = o; const xr = o.xr || [0, 1], yr = o.yr || [0, 1];
    const g = this.g(); const col = o.color || '#5b616b';
    const X = v => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
    const Y = v => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
    const A = { g, X, Y, labels: [], xr, yr, x, y, w, h };
    A.clipId = this.clip(x - 2, y - 30, w + 4, h + 32);
    if (o.grid) {
      (o.xticks || []).forEach(t => this.line(X(t), y, X(t), y + h, { parent: g, stroke: C.grid, width: 1.2 }));
      (o.yticks || []).forEach(t => this.line(x, Y(t), x + w, Y(t), { parent: g, stroke: C.grid, width: 1.2 }));
    }
    const y0 = clamp(Y(0), y, y + h), x0 = clamp(X(0), x, x + w);
    this.arrow(x, y0, x + w + 18, y0, { parent: g, color: col, width: 2, head: 12 });
    if (o.yaxis !== false) this.arrow(x0, y + h, x0, y - 18, { parent: g, color: col, width: 2, head: 12 });
    const fs = o.tickSize || 19;
    (o.xticks || []).forEach(t => {
      this.line(X(t), y0 - 5, X(t), y0 + 5, { parent: g, stroke: col, width: 2 });
      const lab = o.xfmt ? o.xfmt(t) : String(t).replace('-', '−');
      A.labels.push(this.tex(X(t), y0 + 24, lab, { size: fs, color: C.grey }));
    });
    (o.yticks || []).forEach(t => {
      if (o.yaxis === false) return;
      this.line(x0 - 5, Y(t), x0 + 5, Y(t), { parent: g, stroke: col, width: 2 });
      const lab = o.yfmt ? o.yfmt(t) : String(t).replace('-', '−');
      A.labels.push(this.tex(x0 - 12, Y(t), lab, { size: fs, color: C.grey, anchor: 'r' }));
    });
    if (o.xlabel) A.labels.push(this.tex(x + w + 28, y0, o.xlabel, { size: o.labelSize || 24, anchor: 'l', color: C.ink }));
    if (o.ylabel) A.labels.push(this.tex(x0, y - 34, o.ylabel, { size: o.labelSize || 24, anchor: 'b', color: C.ink }));
    A.show = (dur = 1) => all(create(g, dur, { lag: .1 }), fadeIn(A.labels, dur * .8, { lag: .3 }));
    A.fn = (fn, po = {}) => {
      const [a, b] = po.domain || xr; const n = po.samples || 240; let d = '', pen = false;
      const lo = yr[0] - (yr[1] - yr[0]) * .3, hi = yr[1] + (yr[1] - yr[0]) * .3;
      for (let i = 0; i <= n; i++) {
        const xv = a + (b - a) * i / n; const yv = fn(xv);
        if (!isFinite(yv) || yv < lo || yv > hi) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + X(xv).toFixed(2) + ',' + Y(yv).toFixed(2); pen = true;
      }
      return d;
    };
    A.plot = (fn, po = {}) => this.path(A.fn(fn, po), { stroke: po.color || C.blue, width: po.width || 4, dash: po.dash, parent: po.parent, clip: A.clipId });
    A.dot = (xv, yv, po = {}) => this.circle(X(xv), Y(yv), po.r || 9, { fill: po.color || C.blue, stroke: '#fff', width: 2.5, ...po });
    return A;
  }

  bars(o) {
    const n = o.values.length, slot = o.w / n, bw = o.barW || slot * .6;
    const B = { g: this.g({ show: true }), rects: [], labels: [], vals: [], values: o.values.map(() => 0), scale: o.scale || 100, base: o.base, slot };
    B.baseline = this.line(o.x - 10, o.base, o.x + o.w + 10, o.base, { stroke: '#5b616b', width: 2 });
    const cols = o.colors || o.values.map(() => o.color || C.blue);
    for (let i = 0; i < n; i++) {
      const cx = o.x + slot * (i + .5);
      B.rects.push(this.rect(cx - bw / 2, o.base, bw, 0, { fill: cols[i], parent: B.g, rx: 3 }));
      if (o.labels) B.labels.push(this.text(cx, o.base + (o.labelGap || 26), o.labels[i], { size: o.labelSize || 22, color: o.labelColor || C.ink, sans: o.sansLabels, tex: o.texLabels }));
      if (o.showVals !== false) B.vals.push(this.text(cx, o.base, '', { size: o.valSize || 20, color: C.grey, anchor: 'b' }));
    }
    B.fmt = o.fmt || (v => fmt(v, 2));
    B.layout = () => B.values.forEach((v, i) => {
      const hpx = v * B.scale, r = B.rects[i];
      r.setAttribute('y', hpx >= 0 ? o.base - hpx : o.base); r.setAttribute('height', Math.abs(hpx));
      const vl = B.vals[i]; if (vl) { vl.textContent = B.fmt(v); const yy = hpx >= 0 ? o.base - hpx - 6 : o.base - hpx + 30; vl.style.top = yy + 'px'; vl._y = yy; }
    });
    B.set = (vals, dur = .8, so = {}) => {
      const from = B.values.slice(), s0 = B.scale, s1 = so.scale ?? B.scale;
      return tween(dur, t => { B.values = from.map((v, i) => lerp(v, vals[i], t)); B.scale = lerp(s0, s1, t); B.layout(); });
    };
    B.show = (dur = .9) => { show(B.vals); return all(create(B.baseline, .5), fadeIn(B.labels, .6, { lag: .3 }), B.set(o.values, dur)); };
    B.cx = i => o.x + slot * (i + .5);
    B.recolor = (cs, dur = .4) => all(B.rects.map((r, i) => colorT(r, 'fill', cs[i], dur)));
    B.layout();
    return B;
  }

  pill(x, y, label, o = {}) {
    const size = o.size || 30, pad = o.pad ?? 16;
    const t = this.text(x, y, label, { size, color: o.color, tex: o.tex, sans: o.sans });
    const w = Math.max(o.minW || 0, t.offsetWidth + pad * 2), h = o.h || size * 1.55;
    const box = this.rect(x - w / 2, y - h / 2, w, h, { rx: o.rx ?? 10, stroke: o.stroke || C.lgrey, width: 2, fill: o.fill || '#ffffff' });
    return { w: label, t, box, cx: x, cy: y, width: w, height: h, left: x - w / 2, right: x + w / 2, top: y - h / 2, bot: y + h / 2, els: [box, t] };
  }
  wordRow(words, o = {}) {
    const size = o.size || 34, gap = o.gap ?? 14, y = o.y;
    const items = words.map(w => this.pill(0, y, w, { ...o, size }));
    const total = items.reduce((a, b) => a + b.width, 0) + gap * (items.length - 1);
    let cx = o.left ?? ((o.cx ?? 800) - total / 2);
    items.forEach(it => {
      const c = cx + it.width / 2; it.cx = c; it.t.style.left = c + 'px'; it.t._x = c;
      it.box.setAttribute('x', cx); it.left = cx; it.right = cx + it.width; cx += it.width + gap;
    });
    return items;
  }
  matrix(x, y, data, o = {}) {
    const rows = data.length, cols = data[0].length, cw = o.cw || 72, ch = o.ch || 46;
    const g = this.g(); const M = { g, x, y, w: cols * cw, h: rows * ch, cells: [], txt: [], cw, ch };
    for (let i = 0; i < rows; i++) {
      M.cells.push([]); M.txt.push([]);
      for (let j = 0; j < cols; j++) {
        const v = data[i][j];
        M.cells[i].push(this.rect(x + j * cw + 2, y + i * ch + 2, cw - 4, ch - 4, { fill: o.heat ? diverge(v / (o.heatMax || 1)) : (o.cellFill || '#ffffff'), rx: 4, parent: g, fillOp: o.heat ? .9 : 1 }));
        M.txt[i].push(this.text(x + j * cw + cw / 2, y + i * ch + ch / 2, typeof v === 'number' ? (o.fmt ? o.fmt(v) : fmt(v, 1)) : v, { size: o.size || 21, color: o.color || C.ink }));
      }
    }
    const bl = 12;
    M.br = [this.path(`M${x + bl},${y - 4} L${x - 2},${y - 4} L${x - 2},${y + rows * ch + 4} L${x + bl},${y + rows * ch + 4}`, { parent: g, width: 2.5 }),
    this.path(`M${x + cols * cw - bl},${y - 4} L${x + cols * cw + 2},${y - 4} L${x + cols * cw + 2},${y + rows * ch + 4} L${x + cols * cw - bl},${y + rows * ch + 4}`, { parent: g, width: 2.5 })];
    M.show = (dur = .9) => all(create(g, dur, { lag: .05 }), fadeIn(M.txt, dur, { lag: .4 }));
    M.allTxt = () => M.txt.flat();
    return M;
  }
  network(layers, o = {}) {
    const N = { L: [], E: [], gE: this.g(), gN: this.g() };
    layers.forEach(l => {
      const n = l.n, gap = l.gap || 70, y0 = (o.cy || 470) - gap * (n - 1) / 2;
      N.L.push(Array.from({ length: n }, (_, i) => {
        const yy = y0 + i * gap;
        return { x: l.x, y: yy, c: this.circle(l.x, yy, l.r || 20, { parent: N.gN, stroke: C.ink, width: 2.5, fill: '#ffffff' }) };
      }));
    });
    for (let k = 0; k < N.L.length - 1; k++) {
      N.E.push(N.L[k].map(a => N.L[k + 1].map(b => this.line(a.x, a.y, b.x, b.y, { parent: N.gE, stroke: C.lgrey, width: 1.6 }))));
    }
    N.show = (dur = 1.2) => { show(N.gN); return all(grow(N.L.flat().map(n => n.c), dur * .6, { lag: .5 }), wait(dur * .25).then(() => create(N.gE, dur, { lag: .3 }))); };
    return N;
  }
  table(x, y, colW, rows, o = {}) {
    const rh = o.rh || 56, size = o.size || 24, totalW = colW.reduce((a, b) => a + b, 0);
    const top = this.line(x, y, x + totalW, y, { stroke: C.ink, width: 2.2 });
    const out = rows.map((r, ri) => {
      let cx = x; const cells = r.map((c, ci) => {
        const t = this.text(cx + 14, y + ri * rh + rh / 2, c, { anchor: 'l', size, sans: o.sans, weight: ri === 0 ? 600 : 400, color: ri === 0 ? C.ink : (ci === 0 ? '#2b2f36' : '#3a3f47'), w: colW[ci] - 22 });
        cx += colW[ci]; return t;
      });
      const isLast = ri === rows.length - 1;
      const line = this.line(x, y + (ri + 1) * rh, x + totalW, y + (ri + 1) * rh, { stroke: ri === 0 || isLast ? C.ink : C.grid, width: ri === 0 || isLast ? 2 : 1.4 });
      return { cells, line };
    });
    out.top = top;
    out.reveal = (ri, dur = .5) => all(fadeIn(out[ri].cells, dur, { lag: .25, shift: [0, 8] }), create(out[ri].line, dur), ri === 0 ? create(top, dur) : null);
    return out;
  }
  plane(o) {
    const { cx, cy, unit } = o; const xr = o.xr || [-4, 4], yr = o.yr || [-3, 3];
    const g = this.g(); const P = (x, y) => [cx + x * unit, cy - y * unit];
    for (let i = Math.ceil(xr[0]); i <= xr[1]; i++) this.line(...P(i, yr[0]), ...P(i, yr[1]), { parent: g, stroke: i === 0 ? '#9aa0a8' : C.grid, width: i === 0 ? 2 : 1.3 });
    for (let j = Math.ceil(yr[0]); j <= yr[1]; j++) this.line(...P(xr[0], j), ...P(xr[1], j), { parent: g, stroke: j === 0 ? '#9aa0a8' : C.grid, width: j === 0 ? 2 : 1.3 });
    const PL = { g, P, unit, cx, cy };
    PL.vec = (x, y, vo = {}) => { const a = this.arrow(cx, cy, ...P(x, y), { color: vo.color || C.blue, width: vo.width || 4, parent: vo.parent }); a.v = [x, y]; return a; };
    PL.setVec = (a, x, y) => { a.v = [x, y]; a.set(cx, cy, ...P(x, y)); };
    PL.vecTo = (a, x, y, dur = .8, e = E.smooth) => { const [x0, y0] = a.v; return tween(dur, t => PL.setVec(a, lerp(x0, x, t), lerp(y0, y, t)), e); };
    PL.show = (dur = 1) => create(g, dur, { lag: .4 });
    return PL;
  }
}

/* ---------- three.js ---------- */
function loadThree() { return window.THREE ? Promise.resolve() : new Promise(r => window.addEventListener('three-ready', r, { once: true })); }
Scene.prototype.three = async function (x, y, w, h, o = {}) {
  await loadThree(); if (!this.alive) return null;
  const TH = THREE;
  const box = document.createElement('div'); box.className = 'three-box';
  Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  (o.parent || this.root).appendChild(box);
  const renderer = new TH.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, stageScale)));
  renderer.setSize(w, h); renderer.setClearColor(0xffffff, 0); box.appendChild(renderer.domElement);
  const lr = new CSS2DRenderer(); lr.setSize(w, h); lr.domElement.className = 'three-labels'; box.appendChild(lr.domElement);
  const scene = new TH.Scene();
  const cam = new TH.PerspectiveCamera(o.fov || 38, w / h, .05, 500);
  cam.position.set(...(o.cam || [6, 4.2, 7])); cam.lookAt(...(o.target || [0, 0, 0]));
  const controls = new OrbitControls(cam, lr.domElement);
  controls.target.set(...(o.target || [0, 0, 0])); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.autoRotate = !!o.autoRotate; controls.autoRotateSpeed = o.rotSpeed ?? 1;
  scene.add(new TH.HemisphereLight(0xffffff, 0xdfe3ea, 1.6));
  const dl = new TH.DirectionalLight(0xffffff, 1.5); dl.position.set(4, 9, 6); scene.add(dl);
  const col = c => new TH.Color(c);
  const ctx = { TH, scene, cam, renderer, controls, box, frame: [], col };
  ctx.label = (txt, pos, lo = {}) => {
    const d = document.createElement('div'); d.className = 'lbl3d' + (lo.cls ? ' ' + lo.cls : '');
    if (lo.tex) krender(txt, d); else d.innerHTML = txt;
    d.style.color = lo.color || C.ink; d.style.fontSize = (lo.size || 22) + 'px';
    const ob = new CSS2DObject(d); ob.position.set(...pos); (lo.parent || scene).add(ob); ob.el = d; return ob;
  };
  ctx.sphere = (pos, r, c, so = {}) => {
    const m = new TH.Mesh(new TH.SphereGeometry(r, 32, 20), new TH.MeshStandardMaterial({ color: col(c), roughness: .45, metalness: .05, transparent: true, opacity: so.opacity ?? 1 }));
    m.position.set(...pos); (so.parent || scene).add(m); return m;
  };
  const up = new TH.Vector3(0, 1, 0);
  ctx.arrow = (from, to, c, ao = {}) => {
    const g = new TH.Group(); const r = ao.r || .028;
    const mat = new TH.MeshStandardMaterial({ color: col(c), roughness: .5, transparent: true, opacity: ao.opacity ?? 1 });
    const shaft = new TH.Mesh(new TH.CylinderGeometry(r, r, 1, 16), mat);
    const head = new TH.Mesh(new TH.ConeGeometry(r * 3, r * 8, 24), mat);
    g.add(shaft); g.add(head); (ao.parent || scene).add(g); g.mat = mat;
    g.setTo = (a, b) => {
      const A = new TH.Vector3(...a), B = new TH.Vector3(...b), d = B.clone().sub(A), L = d.length();
      const hl = Math.min(r * 8, L * .5);
      g.position.copy(A); g.quaternion.setFromUnitVectors(up, d.clone().normalize());
      shaft.scale.set(1, Math.max(1e-4, L - hl), 1); shaft.position.set(0, (L - hl) / 2, 0);
      head.scale.set(1, hl / (r * 8), 1); head.position.set(0, L - hl / 2, 0); g.a = a; g.b = b;
    };
    g.setTo(from, to); return g;
  };
  ctx.line = (a, b, c, lo = {}) => {
    const geo = new TH.BufferGeometry().setFromPoints([new TH.Vector3(...a), new TH.Vector3(...b)]);
    const mat = lo.dashed ? new TH.LineDashedMaterial({ color: col(c), dashSize: lo.dash || .12, gapSize: lo.gap || .08, transparent: true, opacity: lo.opacity ?? 1 })
      : new TH.LineBasicMaterial({ color: col(c), transparent: true, opacity: lo.opacity ?? 1 });
    const l = new TH.Line(geo, mat); if (lo.dashed) l.computeLineDistances(); scene.add(l);
    l.setTo = (p, q) => { geo.setFromPoints([new TH.Vector3(...p), new TH.Vector3(...q)]); if (lo.dashed) l.computeLineDistances(); };
    return l;
  };
  ctx.axes = (len = 2, ao = {}) => {
    const c = ao.color || '#8a9099'; const out = [];
    [[len, 0, 0], [0, len, 0], [0, 0, len]].forEach((v, i) => {
      out.push(ctx.arrow(v.map(q => -q * (ao.neg ?? 1)), v, c, { r: .012 }));
      if (ao.labels) out.push(ctx.label(ao.labels[i], v.map(q => q * 1.1), { color: C.grey, size: 18, tex: true }));
    });
    return out;
  };
  ctx.grid = (size = 6, div = 12, yy = 0) => { const g = new TH.GridHelper(size, div, 0xd5dae1, 0xe9ecf0); g.position.y = yy; scene.add(g); return g; };
  let raf; const lrRender = () => lr.render(scene, cam);
  const loop = now => { if (!this.alive) return; ctx.frame.forEach(f => f(now)); controls.update(); renderer.render(scene, cam); lrRender(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  this.disposers.push(() => {
    cancelAnimationFrame(raf); controls.dispose();
    scene.traverse(ob => { ob.geometry && ob.geometry.dispose(); if (ob.material) [].concat(ob.material).forEach(m => m.dispose()); });
    renderer.dispose(); renderer.forceContextLoss(); box.remove();
  });
  if (typeof THREE_EXTRAS !== 'undefined') THREE_EXTRAS.forEach(f => f(ctx));
  box.style.opacity = 0; box._op = 1;
  return ctx;
};
