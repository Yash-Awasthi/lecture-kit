'use strict';
/* Gallery: one slide per building block, so authors can copy a working pattern. */

SLIDES.push(titleSlide({
  title: 'Building blocks', subtitle: 'Graphs, trees, flows, arrays, code, heatmaps, networks and 3D, all stepped',
  institute: 'lecture-kit', people: [['Your Name', 'roll no.'], ['Partner Name', 'roll no.']]
}));

/* ===== Graph: breadth-first search ===== */
SLIDES.push({
  section: '1 · Graphs', title: 'Breadth-first search', build(s) {
    s.title('1 · Graphs', 'Breadth-first search visits nodes level by level');
    const P = { A: [220, 420], B: [430, 260], C: [430, 580], D: [660, 200], E: [660, 420], F: [660, 640], G: [890, 420] };
    const E = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'E'], ['C', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'G']];
    const G = s.graph(Object.entries(P).map(([id, [x, y]]) => ({ id, x, y })), E);
    const adj = {}; E.forEach(([a, b]) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); });
    const qh = s.text(1060, 300, '<span class="tag">queue</span>', { anchor: 'l' });
    const Q = s.text(1060, 350, '', { size: 30, sans: true, anchor: 'l' });
    const vh = s.text(1060, 450, '<span class="tag">visited order</span>', { anchor: 'l' });
    const V = s.text(1060, 500, '', { size: 30, sans: true, anchor: 'l', color: C.blue });
    const D = s.defs([
      ['Graph', 'Nodes joined by edges; here undirected.'],
      ['Queue (FIFO)', 'First in, first out: BFS always expands the oldest discovered node.'],
      ['Level', 'Number of edges from the start node. BFS finishes a level before starting the next.']]);
    return [
      async () => { await s.intro(); await G.show(1.4); await s.showDefs(D, [0]); },
      async () => {
        await fadeIn([qh, vh, Q, V], .4); await s.showDefs(D, [1, 2]);
        const q = ['A'], seen = new Set(['A']), order = [];
        await G.color('A', C.orange); Q.textContent = 'A';
        while (q.length) {
          const u = q.shift(); order.push(u); V.textContent = order.join('  ');
          await G.color(u, C.blue, .3, { solid: true });
          for (const w of adj[u]) if (!seen.has(w)) {
            seen.add(w); q.push(w);
            await G.travel([u, w], { color: C.orange, dur: .35 }); await all(G.edgeColor(u, w, C.orange, .2, 3.4), G.color(w, C.orange, .2));
          }
          Q.textContent = q.join('  ') || '(empty)';
        }
      }
    ];
  }
});

/* ===== Tree: binary search tree ===== */
SLIDES.push({
  section: '1 · Graphs', title: 'Binary search tree', build(s) {
    s.title('1 · Graphs', 'A binary search tree, read in order');
    const T = { label: '50', children: [{ label: '30', children: [{ label: '20' }, { label: '40' }] }, { label: '70', children: [{ label: '60' }, { label: '80' }] }] };
    const G = s.tree(T, { cx: 560, y: 260, dx: 140, dy: 150 });
    const out = s.array(1000, 600, Array(7).fill(''), { cw: 66, indices: false });
    const lab = s.text(1000, 560, '<span class="tag">in-order output</span>', { anchor: 'l' });
    const f = s.tex(1230, 260, R`\text{left} < \text{node} < \text{right}`, { size: 32 });
    const D = s.defs([['Binary search tree', 'Each node is larger than everything in its left subtree and smaller than everything in its right.'], ['In-order traversal', 'Left subtree, node, right subtree: visits a BST in sorted order.']]);
    return [
      async () => { await s.intro(); await G.show(1.2); await write(f, .8); await s.showDefs(D, [0]); },
      async () => {
        await all(fadeIn(lab, .3), out.show(.5)); await s.showDefs(D, [1]);
        for (const [k, id] of G.order.in.entries()) { await G.color(id, C.green, .3, { solid: true }); await out.set(k, id, .25); await out.mark(k, C.green, .2); }
      }
    ];
  }
});

/* ===== Flow: a training pipeline ===== */
SLIDES.push({
  section: '2 · Flows', title: 'A training loop as a pipeline', build(s) {
    s.title('2 · Flows', 'One training step, box by box');
    const F = s.flow([{ label: 'batch x, y', sub: 'data' }, { label: 'model f(x)', sub: 'forward' }, { label: 'loss J', sub: 'compare with y' }, { label: '∇J', sub: 'backward' }, { label: 'θ ← θ − α∇J', sub: 'update' }], { at: 380 });
    const cap = s.caption('Every framework, from numpy to PyTorch, runs this loop millions of times.', { y: 600 });
    const D = s.defs([['Forward pass', 'Compute predictions and the loss from the inputs.'], ['Backward pass', 'Compute the gradient of the loss with respect to every parameter.'], ['Update', 'Move the parameters a small step against the gradient.']]);
    return [
      async () => { await s.intro(); await F.show(1.4); },
      async () => { for (let i = 0; i < 5; i++) await F.flowTo(i, i < 3 ? C.blue : C.purple); await fadeIn(cap, .5); await s.showDefs(D); }
    ];
  }
});

/* ===== Array and code: one bubble-sort pass ===== */
SLIDES.push({
  section: '3 · Algorithms', title: 'Bubble sort, one pass', build(s) {
    s.title('3 · Algorithms', 'Bubble sort: one pass pushes the largest value to the end');
    const A = s.array(140, 300, [5, 1, 4, 2, 8, 3], { cw: 84, ch: 70, size: 32 });
    const code = s.code(820, 220, `for j in range(n - 1):
    if a[j] > a[j + 1]:
        a[j], a[j + 1] = a[j + 1], a[j]`, { w: 640 });
    const D = s.defs([['Swap', 'Exchange two neighbouring elements that are out of order.'], ['Pass', 'One sweep from left to right; afterwards the largest value is in place.']]);
    return [
      async () => { await s.intro(); await A.show(.8); await code.show(.8); await s.showDefs(D, [0]); },
      async () => {
        const pj = A.pointer('j', 0, C.orange), pj1 = A.pointer('j+1', 1, C.purple, { below: true });
        await code.hl(1);
        for (let j = 0; j < 5; j++) {
          await all(pj.to(j), pj1.to(j + 1)); await code.hl(2);
          if (A.values[j] > A.values[j + 1]) { await code.hl(3); await A.swap(j, j + 1, .6); }
          await code.hl(1, .2);
        }
        await A.mark(5, C.green, .3, { solid: true }); await code.hlOff(); await s.showDefs(D, [1]);
      }
    ];
  }
});

/* ===== Heatmap: attention weights ===== */
SLIDES.push({
  section: '4 · Matrices', title: 'Attention weights as a heatmap', build(s) {
    s.title('4 · Matrices', 'Attention: every token decides how much to look at every other token');
    const tok = ['the', 'cat', 'sat', 'on', 'mat'], r = rng(3);
    const raw = tok.map(() => tok.map(() => r() * 2)), sharp = tok.map((_, i) => tok.map((_, j) => (i === j ? .5 : 0) + ((i === 2 && j === 1) || (i === 4 && j === 3) || (i === 1 && j === 0) ? 3 : 0) + r() * .4));
    const rowsm = M => M.map(row => softmax(row));
    const H = s.heatmap(330, 230, rowsm(raw), { cw: 92, ch: 70, rowLabels: tok, colLabels: tok, max: 1, labelSize: 22 });
    const f = s.tex(1180, 300, R`\alpha_{ij}=\operatorname{softmax}_j\!\Big(\dfrac{q_i\cdot k_j}{\sqrt{d}}\Big)`, { size: 32 });
    const n = s.note(1000, 450, 'Each row sums to 1. Before training the weights are spread out; after training each word attends to the words that explain it.', { w: 480, size: 21 });
    const D = s.defs([['Query, key', 'Vectors per token; their dot product scores how relevant token j is to token i.'], ['Softmax per row', 'Turns each row of scores into weights that sum to 1.']]);
    return [
      async () => { await s.intro(); await H.show(1); await write(f, .8); await s.showDefs(D); },
      async () => { await H.set(rowsm(sharp), 1.2); await fadeIn(n, .5); show(H.outline(2, 1, C.orange)); }
    ];
  }
});

/* ===== Neurons and activations ===== */
SLIDES.push({
  section: '5 · Neural networks', title: 'Neurons, layers and activations', build(s) {
    s.title('5 · Neural networks', 'A small network and its activation functions');
    const N = s.network([{ x: 160, n: 3 }, { x: 380, n: 5, gap: 72 }, { x: 600, n: 2 }], { cy: 450 });
    const A = s.axes({ x: 820, y: 220, w: 640, h: 400, xr: [-4, 4], yr: [-1.2, 2.2], xticks: [-4, -2, 2, 4], yticks: [-1, 1, 2], xlabel: 'z', grid: true });
    const curves = [[z => Math.max(0, z), C.orange, 'ReLU'], [sigmoid, C.blue, R`\sigma`], [Math.tanh, C.green, R`\tanh`]].map(([fn, col, l], k) => ({ p: A.plot(fn, { color: col, width: 4 }), l: s.tex(1490, 260 + k * 48, l, { size: 26, color: col, anchor: 'l' }) }));
    const D = s.defs([['Neuron', 'Weighted sum of its inputs plus a bias, then an activation.'], ['Activation', 'A non-linear function; without it, stacked layers collapse into one linear map.']]);
    return [
      async () => { await s.intro(); await N.show(1.2); await s.showDefs(D, [0]); },
      async () => {
        for (let k = 0; k < 2; k++) await all(N.L[k].flatMap(a => N.L[k + 1].map(b => pulse(s, [[a.x, a.y], [b.x, b.y]], { color: C.blue, dur: .6, r: 5 }))));
        await A.show(.8); for (const c of curves) await all(create(c.p, .8), fadeIn(c.l, .4)); await s.showDefs(D, [1]);
      }
    ];
  }
});

/* ===== 3D: loss surface and gradient descent ===== */
SLIDES.push({
  section: '6 · 3D', title: 'Gradient descent on a loss surface', build(s) {
    s.title('6 · 3D', 'Gradient descent on a loss surface');
    const f = (x, z) => .18 * x * x + .5 * z * z + .35 * Math.sin(1.3 * x) + .6;
    const g = (x, z) => [.36 * x + .455 * Math.cos(1.3 * x), z];
    const hint = s.text(100, 176, 'drag to rotate, scroll to zoom', { size: 18, sans: true, color: C.grey, anchor: 'l' });
    const D = s.defs([['Loss surface', 'Loss as a height over two parameters.'], ['Step', 'θ ← θ − α∇J(θ), drawn as one segment of the path.']]);
    let ctx;
    return [
      async () => {
        await s.intro(); ctx = await s.three(100, 150, 1400, 600, { cam: [4.5, 8, 7.5], target: [0, .4, 0] }); if (!ctx) return;
        ctx.S = ctx.surface(f, { xr: [-3.4, 3.4], zr: [-3, 3], wire: true, scaleY: .4 }); ctx.grid(7, 14, 0);
        await all(fadeIn(ctx.box, .7), fadeIn(hint, .4)); await s.showDefs(D, [0]);
      },
      async () => {
        if (!ctx) return;
        let x = -3, z = 2.4; const pts = [[x, ctx.S.at(x, z) + .14, z]], ball = ctx.sphere(pts[0], .15, C.orange), path = ctx.path3(pts, C.orange);
        for (let k = 0; k < 28; k++) { const [gx, gz] = g(x, z); x -= .35 * gx; z -= .35 * gz; pts.push([x, ctx.S.at(x, z) + .14, z]); }
        await tween(3, t => { const n = Math.max(1, Math.floor(t * (pts.length - 1))); path.setPoints(pts.slice(0, n + 1)); ball.position.set(...pts[n]); }, E.linear);
        await s.showDefs(D, [1]);
      }
    ];
  }
});

/* ===== 3D: tensors and a network ===== */
SLIDES.push({
  section: '6 · 3D', title: 'Tensors and layers in 3D', build(s) {
    s.title('6 · 3D', 'A CNN shrinks space and grows channels');
    const D = s.defs([['Feature map', 'A height × width × channels tensor; each convolution layer produces a new one.'], ['Dense layer', 'Every neuron connects to every neuron in the previous layer.']]);
    let ctx;
    return [
      async () => {
        await s.intro(); ctx = await s.three(80, 150, 1440, 600, { cam: [0, 1.2, 9.5], target: [0, -.2, 0] }); if (!ctx) return;
        const vols = [[[-5.2, 0, 0], [.3, 2.4, 2.4], C.blue, '32×32×3'], [[-3.9, 0, 0], [.7, 1.8, 1.8], C.teal, '16×16×16'], [[-2.6, 0, 0], [1.1, 1.2, 1.2], C.purple, '8×8×32'], [[-1.4, 0, 0], [1.5, .7, .7], C.orange, '4×4×64']];
        for (const [p, sz, c, l] of vols) { ctx.block(p, sz, c, { opacity: .8 }); ctx.label(l, [p[0], -1.75, 0], { color: C.grey, size: 16 }); }
        ctx.network3d([{ n: 6, color: C.orange, label: 'flatten' }, { n: 5, color: C.green, label: 'hidden' }, { n: 3, color: C.red, label: 'classes' }], { at: [3.2, 0, 0], gap: 1.5, spacing: .5 });
        await fadeIn(ctx.box, .8); await s.showDefs(D);
      }
    ];
  }
});

SLIDES.push(sectionSlide(7, 'Workshop', { subtitle: 'k-means from scratch, then scikit-learn and matplotlib, in the browser' }));
SLIDES.push(workshopSlide('Workshop: clustering and classification'));
SLIDES.push(thanksSlide({ sources: ['Pyodide: Python in the browser, pyodide.org.', 'three.js, threejs.org.', 'KaTeX, katex.org.'] }));
