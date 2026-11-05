'use strict';
/* Slides 25-38: loss surface, SGD, gradients, live training, negative sampling, subsampling,
   using embeddings, summary, then the workshop. */

/* ===== 25. Loss surface (3D) ===== */
function lossF(x, z) { const a = .5, u = x * Math.cos(a) - z * Math.sin(a), v = x * Math.sin(a) + z * Math.cos(a); return .16 * u * u + .55 * v * v + .25 * Math.sin(x * .9) + .25; }
function lossG(x, z) { const h = 1e-4; return [(lossF(x + h, z) - lossF(x - h, z)) / (2 * h), (lossF(x, z + h) - lossF(x, z - h)) / (2 * h)]; }
SLIDES.push({
  section: '9 · Optimisation', title: 'Descending a loss surface', build(s) {
    s.title('9 · Optimisation', 'Descending a loss surface');
    const rd = s.text(1500, 176, '', { size: 21, sans: true, color: C.grey, anchor: 'r' });
    const hint = s.text(100, 176, 'drag to rotate, scroll to zoom', { size: 18, sans: true, color: C.grey, anchor: 'l' });
    const D = s.defs([
      ['Loss surface', 'The loss drawn as a height over parameter space; training looks for the lowest point.'],
      ['Parameters θ', 'All trainable numbers. Here only two, so the surface can be drawn.'],
      ['Steepest descent', 'The direction −∇J: downhill fastest from the current point (purple arrow).']]);
    let ctx, ball, trail, garr, path = [];
    const Hs = .7;
    return [
      async () => {
        await s.intro();
        ctx = await s.three(100, 150, 1400, 595, { cam: [7.5, 6.2, 7.8], target: [0, 1, 0] });
        if (!ctx) return;
        const TH = ctx.TH, n = 48, L = 3.2, pos = [], col = [];
        const c1 = new TH.Color('#3f7fc4'), c2 = new TH.Color('#7fb2e5');
        const P = (i, j) => { const x = -L + 2 * L * i / n, z = -L + 2 * L * j / n; return [x, Math.min(4.2, lossF(x, z)) * Hs, z]; };
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1), cc = (i + j) % 2 ? c1 : c2;
          pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let k = 0; k < 6; k++) col.push(cc.r, cc.g, cc.b);
        }
        const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new TH.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
        ctx.scene.add(new TH.Mesh(geo, new TH.MeshPhongMaterial({ vertexColors: true, side: TH.DoubleSide, shininess: 40, transparent: true, opacity: .93 })));
        ctx.grid(6.4, 16, 0);
        ctx.label('θ₁', [3.6, 0, 0], { color: C.grey }); ctx.label('θ₂', [0, 0, 3.6], { color: C.grey });
        await fadeIn(ctx.box, .8); await all(fadeIn(hint, .4), s.showDefs(D, [0, 1]));
      },
      async () => {
        if (!ctx) return;
        const TH = ctx.TH; const x = 2.6, z = -2.4; path = [[x, lossF(x, z) * Hs + .1, z]];
        ball = ctx.sphere(path[0], .13, C.orange);
        const g = lossG(x, z); garr = ctx.arrow(path[0], [x - g[0] * .9, lossF(x - g[0] * .9, z - g[1] * .9) * Hs + .1, z - g[1] * .9], C.purple, { r: .035 });
        trail = new TH.Line(new TH.BufferGeometry().setFromPoints([new TH.Vector3(...path[0])]), new TH.LineBasicMaterial({ color: new TH.Color(C.orange) }));
        ctx.scene.add(trail); show(rd); rd.innerHTML = `J = ${lossF(x, z).toFixed(3)}`; await s.showDefs(D, [2]);
      },
      async () => {
        if (!ctx || !ball) return;
        const TH = ctx.TH; let [x, , z] = path[0];
        for (let k = 0; k < 28; k++) {
          const g = lossG(x, z), nx = x - .85 * g[0], nz = z - .85 * g[1];
          const p0 = [x, lossF(x, z) * Hs + .1, z], p1 = [nx, lossF(nx, nz) * Hs + .1, nz];
          await tween(k < 6 ? .5 : .18, t => { const q = [lerp(p0[0], p1[0], t), 0, lerp(p0[2], p1[2], t)]; q[1] = lossF(q[0], q[2]) * Hs + .1; ball.position.set(...q); garr.setTo(q, [q[0] - g[0] * .9, q[1] - .02, q[2] - g[1] * .9]); });
          path.push(p1); trail.geometry.setFromPoints(path.map(p => new TH.Vector3(...p)));
          x = nx; z = nz; rd.innerHTML = `step ${k + 1} &nbsp;·&nbsp; J = ${lossF(x, z).toFixed(3)}`;
        }
      }
    ];
  }
});

/* ===== 26. SGD ===== */
SLIDES.push({
  section: '9 · Optimisation', title: 'Stochastic gradient descent', build(s) {
    s.title('9 · Optimisation', 'Stochastic gradient descent');
    const cx = 600, cy = 430, sc = 92, a = 1, b = 5, lv = [.4, 1.5, 3.5, 6.5, 10.5, 15.5, 21];
    const el = lv.map((c, i) => { const rx = Math.sqrt(c / a) * sc, ry = Math.sqrt(c / b) * sc; return s.path(`M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${2 * rx},0 a${rx},${ry} 0 1 0 ${-2 * rx},0`, { stroke: mix(C.blue, '#ffffff', .25 + .1 * i), width: 2 }); });
    const mn = s.circle(cx, cy, 6, { fill: C.ink });
    const P = (x, y) => [cx + x * sc, cy - y * sc];
    const run = (noise, seed, n) => { const r = rng(seed); let x = -4.3, y = 1.6; const pts = [P(x, y)]; for (let k = 0; k < n; k++) { x -= .08 * (2 * a * x + noise * gauss(r)); y -= .08 * (2 * b * y + noise * gauss(r) * 2); pts.push(P(x, y)); } return pts; };
    const gd = s.poly(run(0, 1, 40), { stroke: C.ink, width: 3 }), sg = s.poly(run(2.4, 4, 70), { stroke: C.orange, width: 2.5 });
    const l1 = s.text(1110, 240, '<span style="color:#1d1d1f">━━</span> full gradient descent', { size: 22, anchor: 'l', sans: true });
    const n1 = s.note(1110, 300, 'Each step sums the gradient over every pair in the corpus: smooth, but one step costs a full pass.', { w: 400, size: 20, color: C.grey });
    const l2 = s.text(1110, 400, '<span style="color:#e2711d">━━</span> SGD (one pair or a mini-batch)', { size: 22, anchor: 'l', sans: true });
    const n2 = s.note(1110, 465, 'Each step uses a noisy estimate from a few pairs. Cheap, so millions of steps are affordable. word2vec uses this.', { w: 400, size: 20, color: C.grey });
    const cap = s.caption('Training loop: initialise W and W′ with small random values, pick a pair, forward pass, loss, gradients, update; repeat over the corpus for several epochs.', { y: 712 });
    const D = s.defs([
      ['Stochastic gradient descent', 'Gradient descent that updates after each pair or small batch, using a noisy gradient estimate.'],
      ['Mini-batch', 'A small group of pairs whose gradients are combined into one update.'],
      ['Epoch', 'One full pass over every training pair in the corpus.']]);
    return [
      async () => { await s.intro(); await create(el, 1.2, { lag: .5 }); await grow(mn, .3); },
      async () => { await fadeIn(l1, .4); await create(gd, 1.5); await fadeIn(n1, .4); },
      async () => { await fadeIn(l2, .4); await create(sg, 2.3); await fadeIn(n2, .4); await s.showDefs(D, [0, 1]); },
      async () => { await fadeIn(cap, .5); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 27. Gradient wrt the center vector ===== */
SLIDES.push({
  section: '9 · Optimisation', title: 'Gradient for the center vector', build(s) {
    s.title('9 · Optimisation', 'Gradient for the center vector');
    const PL = s.plane({ cx: 470, cy: 450, unit: 92, xr: [-4, 4], yr: [-3, 3] });
    const U = [[-0.6, 2.0], [2.2, -0.4], [1.6, 1.2], [-1.8, -0.8]], names = ['quick', 'lazy', 'over', 'dog'], ucol = [C.green, C.grey, C.grey, C.grey];
    const ua = U.map((u, i) => PL.vec(...u, { color: ucol[i], width: 3.5 }));
    const ul = U.map((u, i) => s.tex(...PL.P(u[0] * 1.14, u[1] * 1.14 + .05), i === 0 ? R`\cgreen{u_o}\ \text{quick}` : R`\cgrey{u_{\text{${names[i]}}}}`, { size: 21 }));
    let v = [1.0, 0.6];
    const va = PL.vec(...v, { color: C.blue, width: 5 }), vl = s.tex(0, 0, R`\vc`, { size: 28 });
    const ea = s.arrow(PL.cx, PL.cy, PL.cx, PL.cy, { color: C.orange, width: 3, dash: '8 6' });
    const el = s.tex(0, 0, R`\corange{\textstyle\sum_w P(w\mid c)\,u_w}`, { size: 20 });
    const ga = s.arrow(0, 0, 0, 0, { color: C.purple, width: 4 });
    const f = s.tex(1210, 210, R`\frac{\partial J}{\partial \vc}=-\cgreen{u_o}+\corange{\sum_{w}P(w\mid c)\,u_w}`, { size: 28 });
    const fl = s.note(990, 300, 'Truth minus expectation: move v<sub>c</sub> toward the true context vector and away from the model’s current average guess.', { w: 520, size: 20, color: C.grey });
    const B = s.bars({ x: 1000, w: 480, base: 660, scale: 230, values: [0, 0, 0, 0], labels: names, colors: ucol.map((c, i) => i ? C.orange : C.green), labelSize: 19 });
    const bl = s.tex(1240, 395, R`P(w\mid c)`, { size: 21, color: C.grey });
    const upd = () => {
      const p = softmax(U.map(u => dot(u, v))), e = [0, 1].map(k => U.reduce((acc, u, i) => acc + p[i] * u[k], 0)), g = [e[0] - U[0][0], e[1] - U[0][1]];
      PL.setVec(va, ...v); const [vx, vy] = PL.P(v[0] * 1.15 + .25, v[1] * 1.15 - .25); vl.style.left = vx + 'px'; vl.style.top = vy + 'px';
      ea.set(PL.cx, PL.cy, ...PL.P(...e)); const [ex, ey] = PL.P(e[0] + .3, e[1] - .4); el.style.left = ex + 'px'; el.style.top = ey + 'px';
      ga.set(...PL.P(...v), ...PL.P(v[0] - .5 * g[0], v[1] - .5 * g[1])); B.values = p; B.layout(); return { g };
    };
    upd();
    const D = s.defs([
      ['Expected context vector', 'Σ<sub>w</sub> P(w | c) u<sub>w</sub>: the model’s probability-weighted average guess of the neighbour.'],
      ['∂J/∂v_c', '−u<sub>o</sub> + the expected vector: it points from the truth toward the guess.'],
      ['Update', 'v<sub>c</sub> ← v<sub>c</sub> − α ∂J/∂v<sub>c</sub> moves v<sub>c</sub> toward u<sub>o</sub> and away from the guess.']]);
    return [
      async () => { await s.intro(); await PL.show(.8); await all(create(ua, .8, { lag: .3 }), fadeIn(ul, .6, { lag: .3 })); },
      async () => { await all(create(va, .6), fadeIn(vl, .4)); await all(fadeIn(bl, .3), create(B.baseline, .3), fadeIn(B.labels, .3)); show(B.g, B.vals); await fadeIn(B.rects, .4); },
      async () => { await all(create(ea, .7), fadeIn(el, .5)); await s.showDefs(D, [0]); },
      async () => { await write(f, 1); await fadeIn(fl, .5); await create(ga, .6); await s.showDefs(D, [1]); },
      async () => { for (let k = 0; k < 4; k++) { const { g } = upd(), v0 = v.slice(), v1 = [v[0] - .35 * g[0], v[1] - .35 * g[1]]; await tween(.7, t => { v = [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]; upd(); }); await wait(.15); } await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 28. Gradient wrt context vectors ===== */
SLIDES.push({
  section: '9 · Optimisation', title: 'Gradient for the context vectors', build(s) {
    s.title('9 · Optimisation', 'Gradient for the context vectors: prediction error');
    const names = ['quick', 'brown', 'jumps', 'the', 'lazy'];
    let U = [[-1.0, 1.5], [1.4, 1.4], [0.4, -1.8], [-1.6, -0.6], [2.0, -0.3]];
    const vc = [1.5, 0.5], y = [1, 0, 0, 0, 0];
    const f = s.tex(420, 186, R`\frac{\partial J}{\partial u_w}=\big(\underbrace{P(w\mid c)-y_w}_{\text{prediction error}}\big)\,\vc`, { size: 28 });
    const Bp = s.bars({ x: 110, w: 600, base: 400, scale: 170, values: [0, 0, 0, 0, 0], labels: names, colors: [C.green, C.orange, C.orange, C.orange, C.orange], labelSize: 19 });
    const pl = s.tex(110, 280, R`P(w\mid c)`, { size: 19, color: C.grey, anchor: 'l' });
    const Be = s.bars({ x: 110, w: 600, base: 575, scale: 150, values: [0, 0, 0, 0, 0], colors: Array(5).fill(C.purple) });
    const el = s.tex(110, 495, R`P-y`, { size: 19, color: C.purple, anchor: 'l' });
    const PL = s.plane({ cx: 1150, cy: 450, unit: 76, xr: [-4, 4], yr: [-3.5, 3.5] });
    const va = PL.vec(...vc, { color: C.blue, width: 5 }), vl = s.tex(...PL.P(vc[0] + .35, vc[1] - .3), R`\vc`, { size: 26 });
    const ua = U.map((u, i) => PL.vec(...u, { color: i ? C.orange : C.green, width: 3.2 }));
    const ul = U.map((u, i) => s.text(0, 0, names[i], { size: 19, color: i ? C.orange : C.green }));
    const upd = () => {
      const p = softmax(U.map(u => dot(u, vc)));
      Bp.values = p; Bp.layout(); Be.values = p.map((q, i) => q - y[i]); Be.layout();
      U.forEach((u, i) => { PL.setVec(ua[i], ...u); const [x, yy] = PL.P(u[0] * 1.16, u[1] * 1.16); ul[i].style.left = x + 'px'; ul[i].style.top = yy + 'px'; });
    };
    upd();
    const D = s.defs([
      ['Prediction error P − y', 'Predicted probability minus truth: negative for the true word, positive for every other word.'],
      ['Target y_w', '1 for the true context word, 0 for every other word (the one-hot truth).'],
      ['Push and pull', 'u<sub>o</sub> moves toward v<sub>c</sub>; each wrong word moves away in proportion to the probability it took.']]);
    return [
      async () => { await s.intro(); await write(f, 1); await all(fadeIn([pl, el], .4), create([Bp.baseline, Be.baseline], .4), fadeIn(Bp.labels, .4)); show(Bp.vals, Be.vals); await fadeIn([...Bp.rects, ...Be.rects], .5); await s.showDefs(D, [0, 1]); },
      async () => { await PL.show(.7); await all(create(va, .5), fadeIn(vl, .3), create(ua, .7, { lag: .3 }), fadeIn(ul, .5)); },
      async () => {
        for (let k = 0; k < 8; k++) {
          const p = softmax(U.map(u => dot(u, vc))), U0 = U.map(u => u.slice()), U1 = U.map((u, i) => [u[0] - .45 * (p[i] - y[i]) * vc[0], u[1] - .45 * (p[i] - y[i]) * vc[1]]);
          await tween(.6, t => { U = U0.map((u, i) => [lerp(u[0], U1[i][0], t), lerp(u[1], U1[i][1], t)]); upd(); });
        }
        await s.showDefs(D, [2]);
      }
    ];
  }
});

/* ===== 29. Live training ===== */
function toyCorpus(seed) {
  const r = rng(seed);
  const G = [
    { words: ['cat', 'dog', 'puppy', 'kitten'], ctx: ['pet', 'fur', 'feed', 'vet', 'cute'], color: C.orange, name: 'animals' },
    { words: ['car', 'bus', 'truck', 'train'], ctx: ['drive', 'road', 'fuel', 'wheels', 'ticket'], color: C.blue, name: 'vehicles' },
    { words: ['apple', 'mango', 'bread', 'rice'], ctx: ['eat', 'tasty', 'cook', 'fresh', 'lunch'], color: C.green, name: 'food' },
    { words: ['king', 'queen', 'prince', 'princess'], ctx: ['crown', 'throne', 'castle', 'rules', 'royal'], color: C.purple, name: 'royalty' }];
  const sents = [];
  for (let i = 0; i < 1600; i++) {
    const g = G[Math.floor(r() * 4)], w = g.words[Math.floor(r() * 4)], c1 = g.ctx[Math.floor(r() * 5)], c2 = g.ctx[Math.floor(r() * 5)];
    sents.push(r() < .5 ? ['the', w, c1, c2] : [c1, 'the', w, c2]);
  }
  return { G, sents };
}
SLIDES.push({
  section: '9 · Optimisation', title: 'Watch it learn', build(s) {
    s.title('9 · Optimisation', 'Watch it learn: skip-gram with N = 2, trained live');
    const { G, sents } = toyCorpus(21);
    const vocab = [...new Set(sents.flat())], idx = Object.fromEntries(vocab.map((w, i) => [w, i])), V = vocab.length;
    const pairs = []; sents.forEach(st => st.forEach((w, t) => { for (let j = Math.max(0, t - 2); j <= Math.min(st.length - 1, t + 2); j++) if (j !== t) pairs.push([idx[w], idx[st[j]]]); }));
    const r = rng(9);
    const Wv = Array.from({ length: V }, () => [r() * 2 - 1, r() * 2 - 1]), Wu = Array.from({ length: V }, () => [(r() - .5) * .2, (r() - .5) * .2]);
    const targets = G.flatMap(g => g.words.map(w => ({ w, i: idx[w], color: g.color })));
    const cx = 540, cy = 450, half = 280;
    const frame = s.rect(cx - half, cy - half, 2 * half, 2 * half, { stroke: C.grid, width: 2, rx: 8 });
    const ax = [s.line(cx - half, cy, cx + half, cy, { stroke: C.grid, width: 1.5 }), s.line(cx, cy - half, cx, cy + half, { stroke: C.grid, width: 1.5 })];
    const dots = targets.map(t => s.circle(cx, cy, 9, { fill: t.color, stroke: '#fff', width: 2 }));
    const labs = targets.map(t => s.text(cx, cy, t.w, { size: 18, color: t.color, anchor: 'l' }));
    const leg = G.map((g, i) => s.text(1050, 200 + i * 32, `<span style="color:${g.color}">●</span> ${g.name}: ${g.words.join(', ')}`, { size: 18, sans: true, anchor: 'l', color: '#3b4048' }));
    const A = s.axes({ x: 1060, y: 390, w: 420, h: 170, xr: [0, 1], yr: [0, 3], xticks: [], yticks: [1, 2, 3], xlabel: R`\text{pairs}`, ylabel: R`\text{loss}`, tickSize: 14, labelSize: 17 });
    const lp = s.path('', { stroke: C.orange, width: 2.5, show: true });
    const st = s.text(1060, 640, '', { size: 19, sans: true, color: C.grey, anchor: 'l' });
    const D = s.defs([
      ['Training', 'Repeating SGD updates over many pairs until the loss stops improving.'],
      ['Embedding cluster', 'Words whose vectors end up close together because their contexts overlap.'],
      ['Loss curve', 'Average loss over time. It falls as the predictions improve.']]);
    let scale = 120;
    const draw = () => {
      let mm = 0; targets.forEach(t => { mm = Math.max(mm, Math.abs(Wv[t.i][0]), Math.abs(Wv[t.i][1])); });
      scale = lerp(scale, (half - 50) / Math.max(mm, .3), .08);
      targets.forEach((t, k) => { const x = cx + Wv[t.i][0] * scale, y = cy - Wv[t.i][1] * scale; dots[k].setAttribute('cx', x); dots[k].setAttribute('cy', y); labs[k].style.left = (x + 12) + 'px'; labs[k].style.top = y + 'px'; });
    };
    draw();
    const hist = []; let seen = 0, run = 0, lossAvg = null;
    const train = n => {
      for (let q = 0; q < n; q++) {
        const [c, o] = pairs[Math.floor(r() * pairs.length)], v = Wv[c], gv = [0, 0];
        let Ls = 0;
        for (let k = 0; k <= 3; k++) {
          const w = k === 0 ? o : Math.floor(r() * V), lab = k === 0 ? 1 : 0, u = Wu[w];
          const sg = sigmoid(v[0] * u[0] + v[1] * u[1]), g = (sg - lab) * .05;
          Ls += -Math.log(lab ? sg + 1e-9 : 1 - sg + 1e-9);
          gv[0] += g * u[0]; gv[1] += g * u[1]; u[0] -= g * v[0]; u[1] -= g * v[1];
        }
        v[0] -= gv[0]; v[1] -= gv[1];
        lossAvg = lossAvg == null ? Ls : lossAvg * .998 + Ls * .002;
      }
      seen += n;
    };
    return [
      async () => { await s.intro(); await all(create([frame, ...ax], .6), fadeIn(leg, .6, { lag: .3 })); await grow(dots, .6, { lag: .5 }); await fadeIn(labs, .4); },
      async () => {
        await A.show(.6); show(st); await s.showDefs(D, [0, 2]);
        s.loop(() => {
          if (run++ > 1100) return false;
          train(Math.round(260 * Anim.speed)); draw();
          if (run % 4 === 0) { hist.push(lossAvg); lp.setAttribute('d', hist.map((h, i) => `${i ? 'L' : 'M'}${A.X(i / 275)},${A.Y(Math.min(3, h))}`).join('')); }
          st.textContent = `${commas(seen)} pair updates · loss ${lossAvg.toFixed(3)}`;
        });
      },
      async () => s.showDefs(D, [1])
    ];
  }
});

/* ===== 30. Negative sampling ===== */
SLIDES.push({
  section: '10 · Negative sampling', title: 'Negative sampling: real pair or fake pair?', build(s) {
    s.title('10 · Negative sampling', 'Negative sampling: real pair or fake pair?');
    const f = s.tex(800, 190, R`J=-\log\sigma(\htmlClass{np}{\uo\cdot\vc})\;-\;\htmlClass{nn}{\sum_{i=1}^{k}\log\sigma(-u_{w_i}\cdot\vc)}`, { size: 34 });
    const PL = s.plane({ cx: 420, cy: 515, unit: 68, xr: [-4, 4], yr: [-3, 3] });
    let v = [1.2, 0.8], U = [[-0.8, 1.6], [1.5, 0.3], [0.2, 1.4], [1.0, -0.6]];
    const nm = ['quick', 'galaxy', 'violin', 'tax'], cl = [C.green, C.red, C.red, C.red];
    const va = PL.vec(...v, { color: C.blue, width: 5 }), vl = s.text(0, 0, 'fox', { size: 21, color: C.blue });
    const ua = U.map((u, i) => PL.vec(...u, { color: cl[i], width: 3.2 })), ul = U.map((u, i) => s.text(0, 0, nm[i], { size: 19, color: cl[i] }));
    const B = s.bars({ x: 900, w: 560, base: 660, scale: 260, values: [0, 0, 0, 0], labels: nm, colors: cl, labelSize: 19 });
    const bl = s.tex(1180, 345, R`\sigma(u\cdot\vc)\ =\ \text{probability the pair is real}`, { size: 21, color: C.grey });
    const cap = s.caption('A full softmax touches all V words for every pair. Negative sampling touches only the true pair and k random ones.');
    const draw = () => {
      PL.setVec(va, ...v); const [x, y] = PL.P(v[0] * 1.15 + .2, v[1] * 1.15); vl.style.left = x + 'px'; vl.style.top = y + 'px';
      U.forEach((u, i) => { PL.setVec(ua[i], ...u); const [a, b] = PL.P(u[0] * 1.18, u[1] * 1.18); ul[i].style.left = a + 'px'; ul[i].style.top = b + 'px'; });
      B.values = U.map(u => sigmoid(3 * dot(u, v))); B.layout();
    };
    draw();
    const D = s.defs([
      ['Negative sampling', 'Replace the V-way softmax with k + 1 yes/no questions: is this (center, word) pair real?'],
      ['Positive pair', 'A true (center, context) pair taken from the corpus.'],
      ['Negative sample', 'A random word paired with the center and treated as fake.'],
      ['k', 'Negatives per positive pair: about 5 to 20 for small data, 2 to 5 for large data.']]);
    return [
      async () => { await s.intro(); await write(f, 1.2); await all(fadeIn(cap, .5), s.showDefs(D, [0])); },
      async () => {
        const b1 = s.braceUnder(f.querySelector('.np'), 'real pair: push its score up', { color: C.green, size: 20 });
        const b2 = s.braceUnder(f.querySelector('.nn'), 'k fake pairs: push their scores down', { color: C.red, size: 20, w: 420 });
        await all(create([b1[0], b2[0]], .5), fadeIn([b1[1], b2[1]], .5)); await s.showDefs(D, [1, 2, 3]);
      },
      async () => { await PL.show(.7); await all(create(va, .5), fadeIn(vl, .3)); await all(create(ua[0], .5), fadeIn(ul[0], .3)); await all(create(ua.slice(1), .6, { lag: .3 }), fadeIn(ul.slice(1), .6, { lag: .3, shift: [0, -20] })); },
      async () => { await all(fadeIn(bl, .4), create(B.baseline, .3), fadeIn(B.labels, .3)); show(B.g, B.vals); await fadeIn(B.rects, .4); },
      async () => {
        for (let k = 0; k < 9; k++) {
          const g = U.map((u, i) => sigmoid(3 * dot(u, v)) - (i === 0 ? 1 : 0)), U0 = U.map(u => u.slice()), v0 = v.slice();
          const U1 = U.map((u, i) => [u[0] - .35 * g[i] * v[0], u[1] - .35 * g[i] * v[1]]);
          const gv = [0, 1].map(d => U.reduce((acc, u, i) => acc + g[i] * u[d], 0)), v1 = [v[0] - .12 * gv[0], v[1] - .12 * gv[1]];
          await tween(.55, t => { U = U0.map((u, i) => [lerp(u[0], U1[i][0], t), lerp(u[1], U1[i][1], t)]); v = [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]; draw(); });
        }
      }
    ];
  }
});

/* ===== 31. Sigmoid ===== */
SLIDES.push({
  section: '10 · Negative sampling', title: 'The sigmoid', build(s) {
    s.title('10 · Negative sampling', 'The sigmoid');
    const A = s.axes({ x: 140, y: 190, w: 820, h: 455, xr: [-6, 6], yr: [0, 1.05], xticks: [-6, -4, -2, 2, 4, 6], yticks: [.5, 1], xlabel: 'x', grid: true });
    const p1 = A.plot(sigmoid, { color: C.blue, width: 4.5 }), p2 = A.plot(x => sigmoid(-x), { color: C.red, width: 3, dash: '10 8' });
    const d1 = A.dot(-4, sigmoid(-4), { color: C.blue }), d2 = A.dot(-4, sigmoid(4), { color: C.red });
    const s1 = s.line(0, 0, 0, 0, { stroke: C.blue, width: 8, op: .5 }), s2 = s.line(0, 0, 0, 0, { stroke: C.red, width: 8, op: .5 });
    const f = s.tex(1250, 235, R`\sigma(x)=\dfrac{1}{1+e^{-x}}`, { size: 36 });
    const r1 = s.tex(1080, 340, '', { size: 27, anchor: 'l' }), r2 = s.tex(1080, 395, '', { size: 27, anchor: 'l' }), r3 = s.tex(1080, 450, '', { size: 27, anchor: 'l' });
    const n = s.note(1080, 575, 'Since σ(−x) = 1 − σ(x), the fake-pair term rewards the model for calling the noise “fake”.', { w: 440, size: 21 });
    const setX = x => {
      d1.setAttribute('cx', A.X(x)); d1.setAttribute('cy', A.Y(sigmoid(x))); d2.setAttribute('cx', A.X(x)); d2.setAttribute('cy', A.Y(sigmoid(-x)));
      s1.setAttribute('x1', A.X(x) - 14); s1.setAttribute('x2', A.X(x) - 14); s1.setAttribute('y1', A.Y(0)); s1.setAttribute('y2', A.Y(sigmoid(x)));
      s2.setAttribute('x1', A.X(x) - 14); s2.setAttribute('x2', A.X(x) - 14); s2.setAttribute('y1', A.Y(sigmoid(x))); s2.setAttribute('y2', A.Y(1));
      s.setTex(r1, R`\cblue{\sigma(${fmt(x, 1)})} = ${sigmoid(x).toFixed(3)}`); s.setTex(r2, R`\cred{\sigma(${fmt(-x, 1)})} = ${sigmoid(-x).toFixed(3)}`); s.setTex(r3, R`\text{sum} = 1.000`);
    };
    setX(-4);
    const D = s.defs([
      ['Sigmoid σ(x)', '1 / (1 + e<sup>−x</sup>): squashes any real score into the range (0, 1).'],
      ['Activation function', 'A non-linear function applied to a neuron’s value. Skip-gram’s hidden layer has none; σ appears only at the output.'],
      ['Binary classification', 'Choosing between two classes, here real pair versus fake pair.']]);
    return [
      async () => { await s.intro(); await A.show(.9); await create(p1, 1); await write(f, .8); await s.showDefs(D, [0, 1]); },
      async () => { await all(grow(d1, .3), fadeIn(r1, .3)); await tween(2.5, t => setX(lerp(-4, 4, t))); await s.showDefs(D, [2]); },
      async () => { await create(p2, .9); await all(grow(d2, .3), create([s1, s2], .3), fadeIn([r2, r3], .3)); await tween(3, t => setX(lerp(4, -2.5, t))); await fadeIn(n, .5); }
    ];
  }
});

/* ===== 32. Noise distribution ===== */
SLIDES.push({
  section: '10 · Negative sampling', title: 'Which words become negatives?', build(s) {
    s.title('10 · Negative sampling', 'Which words become negatives?');
    const W = ['the', 'of', 'and', 'cat', 'river', 'zebra', 'quantum'], cnt = [5000, 3000, 2600, 300, 120, 20, 8];
    const P = a => { const q = cnt.map(c => Math.pow(c, a)); const s0 = q.reduce((x, y) => x + y, 0); return q.map(v => v / s0); };
    const B = s.bars({ x: 130, w: 860, base: 640, scale: 700, values: P(1), labels: W, color: C.teal, fmt: v => (v * 100).toFixed(1) + '%' });
    const f = s.tex(1270, 215, R`P_n(w)\ \propto\ \text{count}(w)^{\alpha}`, { size: 34 });
    const al = s.tex(1270, 285, '', { size: 32 });
    const cmp = s.note(1080, 355, '', { w: 440, size: 22 }), lab = s.note(1080, 440, '', { w: 440, size: 21, color: C.grey });
    const eff = s.note(1080, 590, 'Per pair, only k + 2 = 7 vectors are updated (center, true context, 5 negatives) instead of V + 1 = 100,001.', { w: 440, size: 21 });
    const setA = a => { s.setTex(al, R`\alpha = ${a.toFixed(2)}`); B.values = P(a); B.layout(); const p = P(a); cmp.innerHTML = `“the”: <b>${(p[0] * 100).toFixed(1)}%</b> &nbsp;·&nbsp; “zebra”: <b>${(p[5] * 100).toFixed(2)}%</b>`; };
    const D = s.defs([
      ['Unigram distribution', 'Each word’s share of the corpus: f(w) = count(w) / total number of tokens.'],
      ['Noise distribution P_n', 'The distribution negatives are drawn from: count(w)<sup>3/4</sup>, renormalised to sum to 1.'],
      ['Exponent 3/4', 'Chosen empirically. It damps very frequent words and gives rare words more chances.']]);
    return [
      async () => { await s.intro(); await B.show(1); await write(f, .8); setA(1); await fadeIn([al, cmp], .4); show(lab); lab.innerHTML = 'α = 1: raw frequency. Negatives are nearly always “the”, “of”, “and”.'; await s.showDefs(D, [0]); },
      async () => { lab.innerHTML = 'α = 0: uniform. Rare words become negatives far too often.'; await tween(1.8, t => setA(lerp(1, 0, t))); },
      async () => { lab.innerHTML = 'α = 3/4: damps the giants, lifts the rare.'; await tween(1.8, t => setA(lerp(0, .75, t))); await indicate(al); await s.showDefs(D, [1, 2]); },
      async () => fadeIn(eff, .5)
    ];
  }
});

/* ===== 33. Subsampling ===== */
SLIDES.push({
  section: '11 · Subsampling', title: 'Subsampling frequent words', build(s) {
    s.title('11 · Subsampling', 'Subsampling frequent words');
    const t0 = 1e-5;
    const A = s.axes({ x: 140, y: 195, w: 760, h: 330, xr: [-6.5, -1], yr: [0, 1.05], xticks: [-6, -5, -4, -3, -2, -1], yticks: [.5, 1], xfmt: v => `10^{${v}}`, xlabel: R`f(w)`, ylabel: R`P(\text{discard})`, grid: true });
    const cv = A.plot(x => Math.max(0, 1 - Math.sqrt(t0 / Math.pow(10, x))), { color: C.red, width: 4 });
    const tl = s.line(A.X(-5), A.y, A.X(-5), A.y + A.h, { stroke: C.grey, width: 2, dash: '6 6' }), tt = s.tex(A.X(-5), A.y - 14, R`t=10^{-5}`, { size: 19, color: C.grey });
    const marks = [['the', .05], ['of', .03], ['cat', 1e-4], ['zebra', 2e-6]].map(([w, f]) => { const x = Math.log10(f), y = Math.max(0, 1 - Math.sqrt(t0 / f)); return { d: A.dot(x, y, { color: C.red, r: 8 }), l: s.text(A.X(x) + (f > 1e-2 ? -12 : 12), A.Y(y) + (w === 'of' ? 26 : -22), `${w} ${(y * 100).toFixed(0)}%`, { size: 18, sans: true, anchor: f > 1e-2 ? 'r' : 'l' }) }; });
    const f = s.tex(1240, 230, R`P(\text{discard } w)=1-\sqrt{\dfrac{t}{f(w)}}`, { size: 32 });
    const n = s.note(1000, 360, 'Frequent words co-occur with everything, so their pairs carry little information while eating training time.', { w: 520, size: 21 });
    const ef = s.note(1000, 470, 'Effect: faster training and better vectors for the informative, rarer words.', { w: 520, size: 21, color: C.grey });
    const W = s.wordRow('the cat sat on the mat by the door'.split(' '), { y: 650, size: 29, cx: 800 });
    const drop = [0, 4, 7];
    const strike = drop.map(i => s.line(W[i].left + 6, 650, W[i].right - 6, 650, { stroke: C.red, width: 3 }));
    const D = s.defs([
      ['Subsampling', 'Randomly discarding occurrences of very frequent words before making training pairs.'],
      ['Relative frequency f(w)', 'The fraction of all tokens in the corpus that are the word w.'],
      ['Threshold t', 'Words with f(w) ≤ t are never dropped. About 10<sup>−5</sup> in the paper.']]);
    return [
      async () => { await s.intro(); await A.show(.9); await write(f, .9); await s.showDefs(D, [0, 1]); },
      async () => { await create(cv, 1.1); await all(create(tl, .4), fadeIn(tt, .3)); await all(marks.map(m => all(grow(m.d, .3), fadeIn(m.l, .3)))); await fadeIn(n, .5); await s.showDefs(D, [2]); },
      async () => { await fadeIn(W.flatMap(w => w.els), .5, { lag: .3 }); for (const [k, i] of drop.entries()) await all(create(strike[k], .3), opacityT([W[i].box, W[i].t], .3, .3)); await fadeIn(ef, .4); }
    ];
  }
});

/* ===== 34. Nearest neighbours ===== */
SLIDES.push({
  section: '12 · Using embeddings', title: 'Cosine similarity and nearest neighbours', build(s) {
    s.title('12 · Using embeddings', 'Cosine similarity and nearest neighbours');
    const cx = 500, cy = 450, sc = 92, r = rng(4);
    const groups = [[25, C.orange, ['dog', 'cat', 'puppy', 'kitten', 'horse', 'wolf']], [110, C.blue, ['car', 'bus', 'truck', 'train', 'van']], [195, C.green, ['apple', 'mango', 'bread', 'rice', 'soup']], [285, C.purple, ['king', 'queen', 'prince', 'crown']]];
    const pts = groups.flatMap(([a, col, ws]) => ws.map(w => { const an = (a + (r() * 2 - 1) * 16) * Math.PI / 180, rr = 1.3 + r() * 1.7; return { w, col, v: [rr * Math.cos(an), rr * Math.sin(an)] }; }));
    pts.forEach(p => { p.c = s.circle(cx + p.v[0] * sc, cy - p.v[1] * sc, 8, { fill: p.col, stroke: '#fff', width: 2 }); p.l = s.text(cx + p.v[0] * sc + 11, cy - p.v[1] * sc, p.w, { size: 18, color: p.col, anchor: 'l' }); });
    const o = s.circle(cx, cy, 4, { fill: C.ink });
    const q = pts[0], qa = Math.atan2(q.v[1], q.v[0]);
    const cone = s.path('', { fill: C.orange, fillOp: .12, stroke: C.orange, width: 1.5, show: true });
    const ranked = pts.slice(1).map(p => ({ p, c: dot(p.v, q.v) / (norm(p.v) * norm(q.v)) })).sort((a, b) => b.c - a.c).slice(0, 6);
    const f = s.tex(1250, 205, R`\cos(a,b)=\dfrac{a\cdot b}{\lVert a\rVert\,\lVert b\rVert}`, { size: 30 });
    const head = s.text(1060, 290, 'nearest to <span class="hl-o">dog</span> by cosine', { size: 24, anchor: 'l' });
    const rows = ranked.map((x, i) => s.text(1060, 345 + i * 46, `${i + 1}. &nbsp;<span style="color:${x.p.col}">${x.p.w}</span> &nbsp;<span class="dim">${x.c.toFixed(3)}</span>`, { size: 24, anchor: 'l' }));
    const n = s.note(1060, 660, 'Cosine looks at angle, not distance: a wedge around the query direction.', { w: 440, size: 20, color: C.grey });
    const setCone = w => { const R0 = 400, a0 = qa - w, a1 = qa + w; cone.setAttribute('d', `M${cx},${cy} L${cx + R0 * Math.cos(a0)},${cy - R0 * Math.sin(a0)} A${R0},${R0} 0 0 0 ${cx + R0 * Math.cos(a1)},${cy - R0 * Math.sin(a1)} Z`); };
    setCone(0);
    const D = s.defs([
      ['Cosine similarity', 'a · b / (‖a‖‖b‖): the cosine of the angle, from −1 (opposite) through 0 to 1 (same direction).'],
      ['Nearest neighbours', 'The words whose vectors have the highest cosine similarity to a query word.'],
      ['Why ignore length', 'Vector length mostly reflects frequency and training dynamics, not meaning.']]);
    return [
      async () => { await s.intro(); await grow([o, ...pts.map(p => p.c)], .8, { lag: .6 }); await fadeIn(pts.map(p => p.l), .5); },
      async () => { await write(f, .8); await s.showDefs(D, [0, 2]); },
      async () => { await indicate(q.c, { scale: 1.8 }); await fadeIn(head, .4); await tween(2.2, t => setCone(t * .42)); },
      async () => { for (const r0 of rows) await fadeIn(r0, .3, { shift: [10, 0] }); await fadeIn(n, .4); await s.showDefs(D, [1]); }
    ];
  }
});

/* ===== 35. Analogies (3D) ===== */
SLIDES.push({
  section: '12 · Using embeddings', title: 'Analogies as vector arithmetic', build(s) {
    s.title('12 · Using embeddings', 'Analogies as vector arithmetic');
    const f = s.tex(800, 182, R`v_{\text{king}}-v_{\text{man}}+v_{\text{woman}}\;\approx\;v_{\text{queen}}`, { size: 34 });
    const P = { man: [-1.5, -0.7, 0.2], woman: [-1.45, 0.85, 0.25], king: [1.4, -0.6, -0.1], queen: [1.5, 0.95, -0.05], boy: [-1.7, -0.9, 1.9], girl: [-1.65, 0.65, 1.95] };
    const col = { man: C.blue, woman: C.pink, king: C.blue, queen: C.pink, boy: C.blue, girl: C.pink };
    const D = s.defs([
      ['Analogy a : b :: c : ?', 'Solved as b − a + c, then the nearest word, excluding the three query words.'],
      ['Vector offset', 'A difference of vectors such as woman − man. Similar relations give similar offsets.'],
      ['Emergent property', 'Not trained for directly; it appears approximately, and best with large corpora.']]);
    let ctx;
    const grow3 = (pairs, c, label, lp) => { const a = pairs.map(([x]) => ctx.arrow(P[x], P[x], c, { r: .025 })); return tween(1.2, t => a.forEach((ar, i) => ar.setTo(P[pairs[i][0]], P[pairs[i][0]].map((v, k) => lerp(v, P[pairs[i][1]][k], t))))).then(() => ctx.label(label, lp, { color: c, size: 18 })); };
    return [
      async () => {
        await s.intro(); await write(f, 1);
        ctx = await s.three(150, 215, 1300, 525, { cam: [1.6, 1.8, 6.4], target: [0, .1, .6] });
        if (!ctx) return; ctx.grid(6, 12, -1.8);
        for (const w in P) { ctx.sphere(P[w], .09, col[w]); ctx.label(w, [P[w][0], P[w][1] + .25, P[w][2]], { color: col[w], size: 22 }); }
        await fadeIn(ctx.box, .7); await s.showDefs(D, [0]);
      },
      async () => { if (ctx) await grow3([['man', 'woman'], ['king', 'queen'], ['boy', 'girl']], C.orange, 'gender offset', [-2.3, .1, .2]); await s.showDefs(D, [1]); },
      async () => { if (ctx) await grow3([['man', 'king'], ['woman', 'queen']], C.purple, 'royalty offset', [0, -1.05, .1]); },
      async () => {
        if (!ctx) return;
        const off = P.woman.map((v, k) => v - P.man[k]), tgt = P.king.map((v, k) => v + off[k]), ar = ctx.arrow(P.king, P.king, C.green, { r: .035 });
        await tween(1.5, t => ar.setTo(P.king, P.king.map((v, k) => lerp(v, tgt[k], t))));
        ctx.sphere(tgt, .14, C.green, { opacity: .35 }); ctx.label('king − man + woman', [tgt[0] + .2, tgt[1] - .35, tgt[2]], { color: C.green, size: 18 });
        await s.showDefs(D, [2]);
      }
    ];
  }
});

/* ===== 36. N-gram vs skip-gram ===== */
SLIDES.push({
  section: '13 · Summary', title: 'N-gram vs skip-gram', build(s) {
    s.title('13 · Summary', 'N-gram vs skip-gram');
    const tb = s.table(150, 160, [330, 520, 450], [
      ['', 'N-gram model', 'Skip-gram'],
      ['Task', 'predict the next word from previous ones', 'predict the context around a center word'],
      ['Direction', 'one-sided (past only)', 'both sides'],
      ['Representation', 'discrete symbols, count tables', 'dense learned vectors'],
      ['Estimation', 'counting (closed-form MLE)', 'iterative gradient descent'],
      ['Unseen combinations', 'zero probability without smoothing', 'generalises via similar vectors'],
      ['Parameter growth', 'exponential: Vᴺ', 'linear: 2VN'],
      ['Output of interest', 'sentence probabilities', 'word embeddings'],
      ['Scores or generates sentences', 'yes', 'no, not a language model']], { rh: 64, size: 22, sans: true });
    const D = s.defs([
      ['Generalisation', 'Similar words share similar vectors, so evidence about one word also helps its neighbours.'],
      ['Closed form vs iterative', 'An N-gram model is solved by counting once; skip-gram needs many gradient steps.']]);
    return [async () => { await s.intro(); for (let i = 0; i < tb.length; i++) await tb.reveal(i, .3); await s.showDefs(D); }];
  }
});

/* ===== 37. Limitations, successors, uses ===== */
SLIDES.push({
  section: '13 · Summary', title: 'Limitations, successors and real-world use', build(s) {
    s.title('13 · Summary', 'Limitations, successors and real-world use');
    const river = [[200, 260, 'river'], [280, 200, 'shore'], [170, 190, 'water']], money = [[640, 230, 'money'], [700, 280, 'loan'], [690, 180, 'deposit']];
    const pts = [...river.map(p => [...p, C.teal]), ...money.map(p => [...p, C.orange])].map(([x, y, w, c]) => [s.circle(x, y, 8, { fill: c }), s.text(x + 12, y, w, { size: 19, color: c, anchor: 'l' })]);
    const bank = s.circle(440, 230, 11, { fill: C.purple, stroke: '#fff', width: 2 }), bl = s.text(440, 200, 'bank', { size: 23, color: C.purple });
    const bh = s.text(440, 330, 'one static vector for every sense of “bank”', { size: 20, sans: true, color: C.grey });
    const lim = s.bullets(110, 410, ['<b>Polysemy</b>: senses blended into one vector', '<b>Out-of-vocabulary</b>: unseen words have no vector', '<b>Not a language model</b>: cannot score or generate sentences', '<b>Bias</b>: reflects the corpus, stereotypes included', '<b>Order ignored</b> inside the window'], { w: 640, size: 21, dy: 60, bullet: C.red });
    const uh = s.text(870, 186, 'Where it runs today', { size: 24, anchor: 'l', color: C.blue });
    const uses = s.bullets(870, 236, ['Recommendation: sessions, playlists and baskets used as “sentences” (Airbnb listing embeddings, 2018)', 'Graphs: random walks used as sentences (DeepWalk, node2vec)', 'Search and NLP pipelines: pretrained vectors as input features'], { w: 640, size: 20, dy: 66 });
    const nh = s.text(870, 470, 'What came next', { size: 24, anchor: 'l', color: C.purple });
    const nx = s.bullets(870, 520, ['GloVe (2014): the same co-occurrence statistics, fitted directly', 'fastText (2016): subword vectors cover rare and unseen words', 'ELMo, BERT (2018): a different vector for each context, fixing polysemy'], { w: 640, size: 20, dy: 62, bullet: C.purple });
    const D = s.defs([
      ['Polysemy', 'One word with several meanings, like “bank”. Skip-gram gives it a single blended vector.'],
      ['Out-of-vocabulary (OOV)', 'A word never seen in training, so it has no vector at all.'],
      ['Contextual embedding', 'A vector computed from the whole sentence, so “bank” differs by context.']]);
    return [
      async () => { await s.intro(); await all(grow(pts.map(p => p[0]), .5, { lag: .4 }), fadeIn(pts.map(p => p[1]), .5)); await all(grow(bank, .4), fadeIn(bl, .3)); for (const x of [280, 600, 330, 560, 440]) await all(attrT(bank, { cx: x }, .4), moveText(bl, x, 200, .4)); await fadeIn(bh, .4); await s.showDefs(D, [0]); },
      async () => { await fadeIn(lim, .7, { lag: .4, shift: [-10, 0] }); await s.showDefs(D, [1]); },
      async () => { await fadeIn(uh, .4); await fadeIn(uses, .6, { lag: .4, shift: [-10, 0] }); },
      async () => { await fadeIn(nh, .4); await fadeIn(nx, .6, { lag: .4, shift: [-10, 0] }); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 38. Workshop ===== */
SLIDES.push({ section: 'Workshop', title: 'Workshop: build skip-gram in Python', workshop: true });
