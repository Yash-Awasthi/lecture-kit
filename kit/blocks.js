'use strict';
/* Ready-made slides: title, section divider, workshop placeholder and a closing page with a QR code and sources.
   Each returns a slide object, so a deck writes SLIDES.push(titleSlide({...})). */

function qrModules(text) {
  if (typeof qrcode !== 'function' || !text) return null;
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) m.push([r, c]);
  return { n, m };
}

// Random points that settle into coloured clusters, in 3D. Used as title-page art.
async function clusterArt(s, x, y, w, h, o = {}) {
  const ctx = await s.three(x, y, w, h, { cam: o.cam || [5.6, 3.3, 6.4] });
  if (!ctx) return null;
  ctx.grid(6, 12, -2.3);
  const r = rng(o.seed || 7), groups = o.groups || PALETTE.slice(0, 5).map((c, i) => ({ color: c, c: [Math.cos(i * 1.26) * 1.6, (i % 3 - 1) * 1.1, Math.sin(i * 1.26) * 1.6], words: [] }));
  const pts = groups.flatMap(g => (g.words.length ? g.words : Array.from({ length: 7 }, () => null)).map(wd => ({
    wd, color: g.color, pos: g.c.map(v => v * 1.1 + gauss(r) * .4), rnd: [0, 0, 0].map(() => (r() * 2 - 1) * 2.1)
  })));
  pts.forEach(p => { p.m = ctx.sphere(p.rnd, .075, p.color); if (p.wd) p.l = ctx.label(p.wd, [p.rnd[0], p.rnd[1] + .21, p.rnd[2]], { color: p.color, size: 17 }); });
  ctx.toClusters = (dur = 2.5) => tween(dur, t => pts.forEach(p => {
    const q = p.rnd.map((v, i) => lerp(v, p.pos[i], t)); p.m.position.set(...q); if (p.l) p.l.position.set(q[0], q[1] + .21, q[2]);
  }));
  return ctx;
}

/* o: { title, subtitle, institute, logo, people: [[name, id]], peopleTag, extra: [[tag, text]], art: false | async (s) => {} , artGroups } */
function titleSlide(o) {
  return {
    section: o.section || 'Introduction', title: o.title, notes: o.notes, build(s) {
      const els = [];
      let y = 108;
      const head = [];
      if (o.logo) head.push(s.img(110, 62, 104, 116, o.logo));
      if (o.institute) head.push(s.text(o.logo ? 238 : 110, y, o.institute, { size: 30, anchor: 'l' }));
      const rule = s.line(110, 212, 770, 212, { stroke: C.grid, width: 2 });
      const t = s.text(104, 318, o.title, { size: o.titleSize || 90, anchor: 'l', w: o.art === false ? 1400 : 760, cls: 'wrap' });
      const sub = o.subtitle ? s.text(110, 398 + (o.titleLines ? (o.titleLines - 1) * 100 : 0), o.subtitle, { size: 27, color: '#4a4f57', anchor: 'l', w: o.art === false ? 1380 : 720 }) : null;
      let yy = 506;
      if (o.people && o.people.length) {
        els.push(s.text(110, yy, `<span class="tag">${o.peopleTag || 'presented by'}</span>`, { anchor: 'l' })); yy += 42;
        for (const [name, id] of o.people) { els.push(s.text(110, yy, `${name}${id ? ` <span class="dim">&nbsp;${id}</span>` : ''}`, { size: 30, anchor: 'l' })); yy += 46; }
        yy += 44;
      }
      for (const [tag, text] of o.extra || []) { els.push(s.text(110, yy, `<span class="tag">${tag}</span>`, { anchor: 'l' }), s.text(110, yy + 42, text, { size: 30, anchor: 'l' })); yy += 132; }
      return [async () => {
        await all(fadeIn(head, .6), head[1] ? write(head[1], .8) : null); await create(rule, .5);
        await write(t, 1.1); if (sub) await fadeIn(sub, .6, { shift: [0, 10] });
        await fadeIn(els, .8, { lag: .4, shift: [0, 8] });
        if (o.art === false) return;
        if (typeof o.art === 'function') return o.art(s);
        const ctx = await clusterArt(s, 820, 110, 760, 700, { groups: o.artGroups });
        if (ctx) { await fadeIn(ctx.box, .6); await ctx.toClusters(2.6); }
      }];
    }
  };
}

/* Full-screen section divider: big number and name. */
function sectionSlide(num, name, o = {}) {
  return {
    section: o.section || `${num} · ${name}`, title: name, notes: o.notes, build(s) {
      const n = s.text(110, 400, String(num), { size: 160, anchor: 'l', color: C.lgrey });
      const t = s.text(110 + (String(num).length * 95) + 40, 410, name, { size: 64, anchor: 'l' });
      const sub = o.subtitle ? s.text(115, 530, o.subtitle, { size: 26, anchor: 'l', color: '#4a4f57', w: 1300 }) : null;
      return [async () => { await fadeIn(n, .5); await write(t, .9); if (sub) await fadeIn(sub, .5); }];
    }
  };
}

function workshopSlide(title = 'Workshop') { return { section: 'Workshop', title, workshop: true }; }

/* o: { heading, sub, institute, logo, qr: url, qrLabel, sources: [html, ...] } */
function thanksSlide(o = {}) {
  return {
    section: o.section || 'Close', title: o.title || 'Thank you', notes: o.notes, build(s) {
      const head = [];
      if (o.logo) head.push(s.img(110, 58, 74, 83, o.logo));
      if (o.institute) head.push(s.text(o.logo ? 200 : 110, 100, o.institute, { size: 22, anchor: 'l', color: C.grey }));
      const ty = s.text(106, 230, o.heading || 'Thank you', { size: 96, anchor: 'l' });
      const qn = s.text(112, 305, o.sub ?? 'Questions are welcome.', { size: 28, color: '#4a4f57', anchor: 'l' });
      const src = o.sources || [];
      const sh = src.length ? s.text(110, 418, '<span class="tag">sources</span>', { anchor: 'l' }) : null;
      const cols = src.length > 6 ? 2 : 1, rowH = src.length > 12 ? 52 : 70;
      const items = src.map((t, i) => s.text(110 + (i % cols) * 720, 452 + Math.floor(i / cols) * rowH, `<span class="dim">[${i + 1}]</span> ${t}`, { size: src.length > 12 ? 14.5 : 16.5, anchor: 'tl', w: cols === 2 ? 680 : 1380, color: '#3b4048' }));
      const Q = qrModules(o.qr), qs = 250, qx = 1250, qy = 70, qg = s.g(); let cells = [], ql = null, qu = null;
      if (Q) {
        const cs = qs / (Q.n + 2);
        s.rect(qx, qy, qs, qs, { parent: qg, fill: '#ffffff', stroke: C.grid, width: 1.5, rx: 8 });
        cells = Q.m.map(([r, c]) => s.rect(qx + (c + 1) * cs, qy + (r + 1) * cs, cs + .4, cs + .4, { parent: qg, fill: C.ink }));
        ql = s.text(qx + qs / 2, qy + qs + 26, o.qrLabel || 'slides', { size: 18, sans: true, color: C.grey });
        qu = s.text(qx + qs, qy + qs + 52, o.qr.replace(/^https?:\/\//, '').replace(/\?.*$/, ''), { size: 12.5, sans: true, color: '#9aa0a8', anchor: 'r' });
      }
      return [async () => {
        await all(fadeIn(head, .5), write(ty, 1));
        await fadeIn(qn, .6, { shift: [0, 8] });
        if (Q) { show(qg); await all(fadeIn(cells, .9, { lag: .8 }), fadeIn([ql, qu], .6)); }
        if (sh) { await fadeIn(sh, .3); await fadeIn(items, 1, { lag: .6, shift: [0, 6] }); }
      }];
    }
  };
}
