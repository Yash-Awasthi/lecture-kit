'use strict';
/* Higher-level slide building blocks on top of engine.js: graphs, trees, flows, heatmaps,
   arrays and code listings in 2D, and point clouds, surfaces, boxes and 3D networks in three.js. */

/* ---------- 2D ---------- */
function _curveArrowHead(g, x, y, ux, uy, col, size) {
  const bx = x - ux * size, by = y - uy * size, hw = size * .42;
  return svgEl('polygon', { points: `${x},${y} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`, fill: col, stroke: col, 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
}

const HL_KW = new Set(('def return if elif else for while in not and or import from as class with try except finally raise lambda yield None True False pass break continue global nonlocal async await is del assert ' +
  'function const let var new this return if else for while do switch case break continue try catch throw typeof null undefined true false int float double char void struct include public private static long bool auto template using namespace').split(' '));
function highlightCode(line) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?(?:e-?\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/g;
  let out = '', last = 0, m;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index)); last = re.lastIndex;
    if (m[1]) out += `<span class="ck-c">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="ck-s">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="ck-n">${m[3]}</span>`;
    else if (HL_KW.has(m[4])) out += `<span class="ck-k">${m[4]}</span>${m[5] ? esc(m[5]) : ''}`;
    else if (m[5]) out += `<span class="ck-f">${m[4]}</span>${esc(m[5])}`;
    else out += esc(m[0]);
  }
  return out + esc(line.slice(last));
}

Object.assign(Scene.prototype, {
  /* Nodes and edges. nodes: [{id, x, y, label?, shape?: 'circle'|'box', r?, color?, fill?, tex?}]
     edges: [[from, to, {directed?, bend?, label?, color?, width?}]]. Returns G with G.node[id], G.edge['a-b']. */
  graph(nodes, edges = [], o = {}) {
    const G = { node: {}, edge: {}, nodes: [], edges: [], gE: this.g(), gN: this.g(), labels: [] };
    const sz = o.size || 22;
    for (const n of nodes) {
      const shape = n.shape || o.shape || 'circle', col = n.color || o.color || C.ink, tex = n.tex ?? o.tex;
      const t = this.text(n.x, n.y, n.label ?? String(n.id), { size: n.size || sz, tex, sans: !tex && (n.sans ?? o.sans ?? true), color: n.textColor || C.ink });
      let el, w, h, r = n.r ?? o.r ?? 26;
      if (shape === 'box') {
        w = Math.max(n.w || o.w || 0, t.offsetWidth + 30); h = n.h || o.h || sz * 2.1;
        el = this.rect(n.x - w / 2, n.y - h / 2, w, h, { parent: G.gN, rx: o.rx ?? 10, stroke: col, width: 2.2, fill: n.fill || o.fill || '#ffffff' });
      } else { r = Math.max(r, t.offsetWidth / 2 + 8); w = h = 2 * r; el = this.circle(n.x, n.y, r, { parent: G.gN, stroke: col, width: 2.4, fill: n.fill || o.fill || '#ffffff' }); }
      const N = { id: n.id, x: n.x, y: n.y, el, t, shape, r, w, h, color: col, box: el, els: [el, t] };
      if (n.sub) { N.sub = this.text(n.x, n.y + h / 2 + 18, n.sub, { size: 16, sans: true, color: C.grey }); N.els.push(N.sub); }
      G.node[n.id] = N; G.nodes.push(N);
    }
    const bound = (N, dx, dy) => {
      const L = Math.hypot(dx, dy) || 1;
      if (N.shape === 'box') { const k = Math.min(N.w / 2 / (Math.abs(dx) || 1e-9), N.h / 2 / (Math.abs(dy) || 1e-9)); return [N.x + dx * k, N.y + dy * k]; }
      return [N.x + dx / L * N.r, N.y + dy / L * N.r];
    };
    for (const [a, b, eo = {}] of edges) {
      const A = G.node[a], B = G.node[b]; if (!A || !B) { console.error('graph: unknown node in edge', a, b); continue; }
      const directed = eo.directed ?? o.directed ?? false, col = eo.color || o.edgeColor || '#8a9099', w = eo.width || o.edgeWidth || 2.4, bend = eo.bend ?? 0;
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      const cx = (A.x + B.x) / 2 - dy / L * bend, cy = (A.y + B.y) / 2 + dx / L * bend;
      const p1 = bound(A, cx - A.x, cy - A.y), p2r = bound(B, cx - B.x, cy - B.y);
      const ex = p2r[0] - cx, ey = p2r[1] - cy, eL = Math.hypot(ex, ey) || 1, gap = directed ? 3 : 0;
      const p2 = [p2r[0] - ex / eL * gap, p2r[1] - ey / eL * gap];
      let el;
      if (!bend && directed) el = this.arrow(p1[0], p1[1], p2[0], p2[1], { parent: G.gE, color: col, width: w, head: eo.head || 13, dash: eo.dash });
      else if (!bend) el = this.line(p1[0], p1[1], p2[0], p2[1], { parent: G.gE, stroke: col, width: w, dash: eo.dash });
      else {
        el = this.g({ parent: G.gE });
        const hs = directed ? (eo.head || 13) : 0, ux = ex / eL, uy = ey / eL;
        el.line = svgEl('path', { d: `M${p1[0]},${p1[1]} Q${cx},${cy} ${p2[0] - ux * hs * .8},${p2[1] - uy * hs * .8}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, el);
        if (eo.dash) el.line.setAttribute('stroke-dasharray', eo.dash);
        if (directed) el.headEl = _curveArrowHead(el, p2[0], p2[1], ux, uy, col, hs);
      }
      const E = { a, b, el, color: col, mid: [.25 * p1[0] + .5 * cx + .25 * p2[0], .25 * p1[1] + .5 * cy + .25 * p2[1]], pts: [p1, [cx, cy], p2] };
      if (eo.label != null) {
        const off = eo.labelOffset ?? 16, nx = -dy / L, ny = dx / L;
        E.label = this.text(E.mid[0] + nx * off * (bend >= 0 ? 1 : -1), E.mid[1] + ny * off * (bend >= 0 ? 1 : -1), String(eo.label), { size: eo.labelSize || 18, sans: !eo.tex, tex: eo.tex, color: eo.labelColor || col, cls: 'elab' });
        G.labels.push(E.label);
      }
      G.edge[`${a}-${b}`] = E; G.edges.push(E);
    }
    G.find = (a, b) => G.edge[`${a}-${b}`] || G.edge[`${b}-${a}`];
    G.show = (dur = 1.2) => { show(G.gN); return all(grow(G.nodes.map(n => n.el), dur * .5, { lag: .4 }), fadeIn(G.nodes.flatMap(n => n.sub ? [n.t, n.sub] : [n.t]), dur * .5, { lag: .4 }), wait(dur * .3).then(() => all(create(G.gE, dur * .7, { lag: .3 }), fadeIn(G.labels, dur * .6, { lag: .3 })))); };
    // Tint a node: light fill and coloured outline, or solid with white text.
    G.color = (id, col, dur = .35, so = {}) => { const N = G.node[id]; return all(colorT(N.el, 'stroke', col || N.color, dur), colorT(N.el, 'fill', col ? (so.solid ? col : mix(col, '#ffffff', .8)) : '#ffffff', dur), colorT(N.t, 'color', col && so.solid ? '#ffffff' : C.ink, dur)); };
    G.edgeColor = (a, b, col, dur = .35, wdt) => {
      const E = G.find(a, b); if (!E) return Promise.resolve();
      const ln = E.el.line || E.el, ps = [colorT(ln, 'stroke', col, dur)];
      if (E.el.headEl) ps.push(colorT(E.el.headEl, 'fill', col, dur), colorT(E.el.headEl, 'stroke', col, dur));
      if (wdt) ln.setAttribute('stroke-width', wdt);
      return all(ps);
    };
    // Send a dot along a path of node ids, colouring each edge it crosses when o.color is given.
    G.travel = async (ids, to = {}) => {
      for (let i = 1; i < ids.length; i++) {
        const E = G.find(ids[i - 1], ids[i]); const fwd = E && E.a === ids[i - 1];
        const pts = E ? (fwd ? E.pts : E.pts.slice().reverse()) : [[G.node[ids[i - 1]].x, G.node[ids[i - 1]].y], [G.node[ids[i]].x, G.node[ids[i]].y]];
        const curve = pts.length === 3 ? Array.from({ length: 13 }, (_, k) => { const t = k / 12; return [0, 1].map(d => (1 - t) * (1 - t) * pts[0][d] + 2 * (1 - t) * t * pts[1][d] + t * t * pts[2][d]); }) : pts;
        await pulse(this, curve, { color: to.color || C.orange, dur: to.dur || .5, r: to.r || 7 });
        if (to.mark) await all(G.edgeColor(ids[i - 1], ids[i], to.color || C.orange, .2, 3.4), G.color(ids[i], to.color || C.orange, .2));
      }
    };
    return G;
  },

  /* Tree from nested {label, children:[...]} (id defaults to label). Leaves are spaced o.dx apart, levels o.dy apart. */
  tree(root, o = {}) {
    const dx = o.dx || 110, dy = o.dy || 110, nodes = [], edges = []; let leaf = 0, uid = 0;
    const T = { pre: [], post: [], in: [], bfs: [] };
    const place = (n, depth) => {
      const id = n.id ?? n.label ?? 'n' + uid++, kids = n.children || [];
      T.pre.push(id);
      const xs = kids.map(k => { const r = place(k, depth + 1); edges.push([id, r.id, { directed: o.directed }]); return r; });
      const x = kids.length ? (xs[0].x + xs[xs.length - 1].x) / 2 : leaf++ * dx;
      nodes.push({ ...n, id, x, y: depth * dy, children: undefined }); T.post.push(id);
      return { id, x, kids: xs };
    };
    const top = place(root, 0);
    const inorder = r => { if (r.kids[0]) inorder(r.kids[0]); T.in.push(r.id); r.kids.slice(1).forEach(inorder); };
    inorder(top);
    const q = [top]; while (q.length) { const r = q.shift(); T.bfs.push(r.id); q.push(...r.kids); }
    const minX = Math.min(...nodes.map(n => n.x)), maxX = Math.max(...nodes.map(n => n.x)), ox = (o.cx ?? 800) - (minX + maxX) / 2, oy = o.y ?? 220;
    nodes.forEach(n => { n.x += ox; n.y += oy; });
    const G = this.graph(nodes, edges, o); G.order = T; return G;
  },

  /* A left-to-right (or top-down with o.vertical) pipeline of boxes joined by arrows. */
  flow(steps, o = {}) {
    const n = steps.length, vert = !!o.vertical;
    const a = o.from ?? (vert ? 200 : 140), b = o.to ?? (vert ? 700 : 1460), at = o.at ?? (vert ? 800 : 420);
    const nodes = steps.map((s, i) => {
      const st = typeof s === 'string' ? { label: s } : s, p = n > 1 ? a + (b - a) * i / (n - 1) : (a + b) / 2;
      return { shape: 'box', ...st, id: st.id ?? i, x: vert ? at : p, y: vert ? p : at };
    });
    const edges = nodes.slice(1).map((nd, i) => [nodes[i].id, nd.id, { directed: true, label: steps[i + 1]?.edge }]);
    const G = this.graph(nodes, edges, { shape: 'box', ...o });
    G.flowTo = async (i, col = C.blue) => { if (i > 0) await G.travel([nodes[i - 1].id, nodes[i].id], { color: col, dur: .45 }); await G.color(nodes[i].id, col, .3); };
    return G;
  },

  /* Grid of coloured cells. o.scale: 'seq' (white to o.color) or 'div' (red, white, blue). */
  heatmap(x, y, data, o = {}) {
    const rows = data.length, cols = data[0].length, cw = o.cw || 54, ch = o.ch || 46;
    const flat = data.flat(), max = o.max ?? (Math.max(...flat.map(Math.abs)) || 1), min = o.min ?? (o.scale === 'div' ? -max : Math.min(0, ...flat));
    const colOf = v => o.scale === 'div' ? diverge(v / max) : mix('#ffffff', o.color || C.blue, clamp((v - min) / ((max - min) || 1)));
    const H = { g: this.g(), cells: [], txt: [], labels: [], x, y, cw, ch, data: data.map(r => r.slice()) };
    for (let i = 0; i < rows; i++) {
      H.cells.push([]); H.txt.push([]);
      for (let j = 0; j < cols; j++) {
        const v = data[i][j];
        H.cells[i].push(this.rect(x + j * cw + 1, y + i * ch + 1, cw - 2, ch - 2, { parent: H.g, fill: colOf(v), rx: 3 }));
        if (o.values !== false) H.txt[i].push(this.text(x + j * cw + cw / 2, y + i * ch + ch / 2, (o.fmt || (v => fmt(v, o.digits ?? 2)))(v), { size: o.size || 16, sans: true, color: Math.abs((v - min) / ((max - min) || 1) - (o.scale === 'div' ? .5 : 0)) > .55 ? '#ffffff' : C.ink }));
      }
    }
    (o.rowLabels || []).forEach((l, i) => H.labels.push(this.text(x - 10, y + i * ch + ch / 2, l, { size: o.labelSize || 18, anchor: 'r', sans: !o.texLabels, tex: o.texLabels })));
    (o.colLabels || []).forEach((l, j) => H.labels.push(this.text(x + j * cw + cw / 2, y - 12, l, { size: o.labelSize || 18, anchor: o.rotate ? 'l' : 'b', sans: !o.texLabels, tex: o.texLabels, cls: o.rotate ? 'rot' : '' })));
    H.show = (dur = 1) => all(create(H.g, dur, { lag: .3 }), fadeIn(H.txt.flat(), dur, { lag: .3 }), fadeIn(H.labels, dur * .6, { lag: .3 }));
    H.set = (d, dur = .6) => all(d.flatMap((r, i) => r.map((v, j) => { H.data[i][j] = v; const t = H.txt[i]?.[j]; if (t) t.textContent = (o.fmt || (v => fmt(v, o.digits ?? 2)))(v); return colorT(H.cells[i][j], 'fill', colOf(v), dur); })));
    H.outline = (i, j, col = C.ink) => this.rect(x + j * cw, y + i * ch, cw, ch, { stroke: col, width: 3, rx: 4, show: true });
    return H;
  },

  /* Array of boxes with indices. A.pointer(name, i) adds a movable arrow; A.swap(i, j) animates a swap. */
  array(x, y, values, o = {}) {
    const cw = o.cw || 64, ch = o.ch || 58, size = o.size || 26;
    const A = { g: this.g(), cells: [], idx: [], x, y, cw, ch, values: values.slice() };
    values.forEach((v, i) => {
      const box = this.rect(x + i * cw, y, cw, ch, { parent: A.g, stroke: C.lgrey, width: 2, fill: '#ffffff', rx: 4 });
      const t = this.text(x + i * cw + cw / 2, y + ch / 2, String(v), { size, sans: o.sans ?? false, mono: o.mono });
      A.cells.push({ box, t, w: String(v), els: [box, t] });
      if (o.indices !== false) A.idx.push(this.text(x + i * cw + cw / 2, y + ch + 18, String(i + (o.base ?? 0)), { size: 15, sans: true, color: '#a0a6ae' }));
    });
    A.cx = i => x + i * cw + cw / 2;
    A.show = (dur = .8) => all(create(A.g, dur, { lag: .3 }), fadeIn(A.cells.map(c => c.t), dur, { lag: .3 }), fadeIn(A.idx, dur, { lag: .3 }));
    A.mark = (i, col, dur = .3, so = {}) => tint(A.cells[i], col, dur, so);
    A.set = (i, v, dur = .3) => { A.values[i] = v; A.cells[i].t.textContent = String(v); return indicate(A.cells[i].t, { dur }); };
    A.swap = (i, j, dur = .7) => {
      const ti = A.cells[i].t, tj = A.cells[j].t, h = Math.min(60, 18 + Math.abs(i - j) * 10);
      const xi = A.cx(i), xj = A.cx(j), y0 = ti._y;
      [A.cells[i].t, A.cells[j].t] = [tj, ti];[A.values[i], A.values[j]] = [A.values[j], A.values[i]];
      return tween(dur, t => {
        const s = Math.sin(Math.PI * t) * h;
        ti._x = lerp(xi, xj, t); ti._y = y0 - s; tj._x = lerp(xj, xi, t); tj._y = y0 + s;
        for (const e of [ti, tj]) { e.style.left = e._x + 'px'; e.style.top = e._y + 'px'; }
      });
    };
    A.pointer = (name, i, col = C.orange, po = {}) => {
      const below = po.below, yA = below ? y + ch + (o.indices === false ? 10 : 34) : y - 8, yB = below ? yA + 44 : y - 52;
      const ar = this.arrow(A.cx(i), yB, A.cx(i), yA, { color: col, width: 3, head: 12, show: true });
      const lab = this.text(A.cx(i), below ? yB + 16 : yB - 16, name, { size: 20, sans: true, color: col, show: true, tex: po.tex });
      const P = { i, ar, lab, els: [ar, lab] };
      P.to = (k, dur = .45) => { const x0 = A.cx(P.i), x1 = A.cx(k); P.i = k; return tween(dur, t => { const xx = lerp(x0, x1, t); ar.set(xx, yB, xx, yA); lab._x = xx; lab.style.left = xx + 'px'; }); };
      return P;
    };
    return A;
  },

  /* Code listing with light syntax colouring. C.hl(n) moves a highlight bar to line n (1-based). */
  code(x, y, src, o = {}) {
    const lines = src.replace(/\n$/, '').split('\n'), lh = o.lh || 34, size = o.size || 21, w = o.w || 720, pad = 18;
    const CD = { x, y, lh, lines: [], nums: [] };
    CD.box = this.rect(x, y, w, lines.length * lh + pad * 2, { fill: o.fill || '#f7f8fa', stroke: '#e6e9ee', width: 1.5, rx: 12 });
    CD.bar = this.rect(x + 6, y + pad, w - 12, lh, { fill: o.hlColor || C.lblue, fillOp: .45, rx: 6 });
    const gut = o.numbers === false ? 0 : 44;
    lines.forEach((l, i) => {
      const yy = y + pad + i * lh + lh / 2;
      if (gut) CD.nums.push(this.text(x + 30, yy, String(i + 1), { size: size * .72, mono: true, color: '#b4b9c0', anchor: 'r' }));
      CD.lines.push(this.text(x + pad + gut, yy, highlightCode(l) || '&nbsp;', { size, mono: true, anchor: 'l', cls: 'code' }));
    });
    CD.show = (dur = .8) => all(fadeIn(CD.box, dur * .4), fadeIn([...CD.lines, ...CD.nums], dur, { lag: .4 }));
    CD.hl = (n, dur = .35) => { const ty = y + pad + (n - 1) * lh; if (CD.bar.style.opacity === '0') { CD.bar.setAttribute('y', ty); return fadeIn(CD.bar, dur); } return attrT(CD.bar, { y: ty }, dur); };
    CD.hlOff = (dur = .3) => fadeOut(CD.bar, dur);
    CD.dim = (keep, to = .3) => all(CD.lines.map((l, i) => opacityT(l, keep.includes(i + 1) ? 1 : to, .3)));
    return CD;
  }
});

/* ---------- 3D (added to every ctx returned by s.three) ---------- */
const THREE_EXTRAS = [ctx => {
  const TH = ctx.TH, col = ctx.col, scene = ctx.scene;
  ctx.onFrame = fn => ctx.frame.push(fn);
  // Many small points at once. pts: [[x,y,z], ...]; colors: one colour or a list.
  ctx.cloud = (pts, o = {}) => {
    const geo = new TH.BufferGeometry(), pos = new Float32Array(pts.length * 3), cs = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { pos.set(p, i * 3); const c = col(Array.isArray(o.colors) ? o.colors[i] : (o.color || C.blue)); cs.set([c.r, c.g, c.b], i * 3); });
    geo.setAttribute('position', new TH.BufferAttribute(pos, 3)); geo.setAttribute('color', new TH.BufferAttribute(cs, 3));
    const m = new TH.Points(geo, new TH.PointsMaterial({ size: o.size || .08, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: o.opacity ?? 1 }));
    scene.add(m);
    m.setPositions = P => { P.forEach((p, i) => pos.set(p, i * 3)); geo.attributes.position.needsUpdate = true; };
    return m;
  };
  // Height field y = fn(x, z) over xr × zr, coloured from o.low to o.high by height.
  ctx.surface = (fn, o = {}) => {
    const n = o.n || 48, [x0, x1] = o.xr || [-3, 3], [z0, z1] = o.zr || [-3, 3], sy = o.scaleY ?? 1;
    const geo = new TH.PlaneGeometry(x1 - x0, z1 - z0, n, n); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const P = geo.attributes.position, cs = new Float32Array(P.count * 3); geo.setAttribute('color', new TH.BufferAttribute(cs, 3));
    const lo = col(o.low || C.lblue), hi = col(o.high || C.blue);
    const mat = new TH.MeshStandardMaterial({ vertexColors: true, side: TH.DoubleSide, roughness: .7, transparent: true, opacity: o.opacity ?? .95, flatShading: !!o.flat });
    const mesh = new TH.Mesh(geo, mat); scene.add(mesh);
    if (o.wire) mesh.add(new TH.LineSegments(new TH.WireframeGeometry(geo), new TH.LineBasicMaterial({ color: col(o.wireColor || '#ffffff'), transparent: true, opacity: .35 })));
    mesh.update = f => {
      let mn = Infinity, mx = -Infinity; const ys = [];
      for (let i = 0; i < P.count; i++) { const y = f(P.getX(i), P.getZ(i)) * sy; ys.push(y); mn = Math.min(mn, y); mx = Math.max(mx, y); }
      ys.forEach((y, i) => { P.setY(i, y); const c = lo.clone().lerp(hi, (y - mn) / ((mx - mn) || 1)); cs.set([c.r, c.g, c.b], i * 3); });
      P.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    };
    mesh.update(fn); mesh.at = (x, z) => fn(x, z) * sy;
    return mesh;
  };
  // Box with darker edges, e.g. a tensor or a CNN feature map. size = [w, h, d].
  ctx.block = (center, size, c, o = {}) => {
    const g = new TH.Group(), geo = new TH.BoxGeometry(...size);
    g.mesh = new TH.Mesh(geo, new TH.MeshStandardMaterial({ color: col(c), roughness: .55, transparent: true, opacity: o.opacity ?? .85 }));
    g.edges = new TH.LineSegments(new TH.EdgesGeometry(geo), new TH.LineBasicMaterial({ color: col(o.edge || mix(c, '#000000', .35)) }));
    g.add(g.mesh, g.edges); g.position.set(...center); (o.parent || scene).add(g); return g;
  };
  // Polyline through 3D points, e.g. a gradient-descent trajectory.
  ctx.path3 = (pts, c, o = {}) => {
    const geo = new TH.BufferGeometry().setFromPoints(pts.map(p => new TH.Vector3(...p)));
    const l = new TH.Line(geo, new TH.LineBasicMaterial({ color: col(c), transparent: true, opacity: o.opacity ?? 1 })); scene.add(l);
    l.setPoints = P => geo.setFromPoints(P.map(p => new TH.Vector3(...p)));
    return l;
  };
  // Layers of neuron spheres along x with all-to-all edges. layers: [{n, color, label}].
  ctx.network3d = (layers, o = {}) => {
    const gap = o.gap || 1.6, sp = o.spacing || .45, r = o.r || .11, [ax, ay, az] = o.at || [0, 0, 0], x0 = ax - gap * (layers.length - 1) / 2;
    const nodes = layers.map((L, li) => {
      const k = Math.ceil(Math.sqrt(L.n)), grid = L.n > (o.column || 8);
      return Array.from({ length: L.n }, (_, i) => {
        const p = grid ? [x0 + li * gap, ay + (Math.floor(i / k) - (k - 1) / 2) * sp, az + (i % k - (k - 1) / 2) * sp] : [x0 + li * gap, ay + ((L.n - 1) / 2 - i) * sp, az];
        const m = ctx.sphere(p, r, L.color || C.blue); m.p = p; return m;
      });
    });
    const edges = nodes.slice(1).map((B, li) => nodes[li].flatMap(a => B.map(b => ctx.line(a.p, b.p, o.edgeColor || '#c3c8cf', { opacity: o.edgeOpacity ?? .5 }))));
    layers.forEach((L, li) => { if (L.label) ctx.label(L.label, [x0 + li * gap, Math.min(...nodes[li].map(m => m.p[1])) - .45, az], { color: C.grey, size: 17, tex: L.tex }); });
    return { nodes, edges };
  };
}];
