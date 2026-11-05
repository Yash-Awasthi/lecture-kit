'use strict';
/* Slides 1-12: title, roadmap, N-gram models, word representations, context windows.
   Layout: content above y = 740, optional caption at 750, definitions strip from 782. */

const LOGO = 'assets/logo.png';
texMacros({ vc: R`\cblue{v_c}`, uo: R`\cteal{u_o}`, uw: R`\cteal{u_w}` });
const CLUSTERS = [
  { name: 'animals', color: C.orange, c: [1.6, 0.7, 0.5], words: ['cat', 'dog', 'puppy', 'kitten', 'horse', 'wolf'] },
  { name: 'vehicles', color: C.blue, c: [-1.5, 0.5, 1.2], words: ['car', 'bus', 'truck', 'train', 'bike', 'van'] },
  { name: 'food', color: C.green, c: [0.3, -1.3, -1.3], words: ['apple', 'mango', 'bread', 'rice', 'cheese', 'soup'] },
  { name: 'royalty', color: C.purple, c: [-0.8, 1.4, -1.4], words: ['king', 'queen', 'prince', 'princess', 'throne', 'crown'] },
  { name: 'motion verbs', color: C.teal, c: [1.1, -1.0, 1.7], words: ['run', 'walk', 'jump', 'swim', 'climb', 'ride'] }
];
function cloudPoints(seed) {
  const r = rng(seed);
  return CLUSTERS.flatMap(cl => cl.words.map(w => ({ w, color: cl.color, pos: cl.c.map(v => v * 1.15 + gauss(r) * .42), rnd: [0, 0, 0].map(() => (r() * 2 - 1) * 2.1) })));
}
async function cloud3D(s, x, y, w, h, o = {}) {
  const ctx = await s.three(x, y, w, h, { cam: o.cam || [5.6, 3.3, 6.4] });
  if (!ctx) return null;
  ctx.grid(6, 12, -2.3);
  const pts = cloudPoints(7);
  pts.forEach(p => {
    const st = o.random ? p.rnd : p.pos;
    p.m = ctx.sphere(st, .075, p.color);
    p.l = ctx.label(p.w, [st[0], st[1] + .21, st[2]], { color: p.color, size: o.size || 17 });
  });
  ctx.toClusters = (dur = 2.5) => tween(dur, t => pts.forEach(p => {
    const q = p.rnd.map((v, i) => lerp(v, p.pos[i], t)); p.m.position.set(...q); p.l.position.set(q[0], q[1] + .21, q[2]);
  }));
  return ctx;
}
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'N': 'ᴺ' };
const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
const FOX = 'the quick brown fox jumps over the lazy dog'.split(' ');

/* ===== 1. Title ===== */
SLIDES.push({
  section: 'Introduction', title: 'Skip Gram Models', build(s) {
    const logo = s.img(110, 62, 104, 116, LOGO);
    const inst = s.text(238, 108, 'National Institute of Technology Raipur', { size: 30, anchor: 'l' });
    const rule = s.line(110, 212, 770, 212, { stroke: C.grid, width: 2 });
    const t = s.text(104, 318, 'Skip Gram Models', { size: 90, anchor: 'l' });
    const sub = s.text(110, 398, 'Learning what words mean by predicting their neighbours', { size: 27, color: '#4a4f57', anchor: 'l' });
    const h1 = s.text(110, 506, '<span class="tag">presented by</span>', { anchor: 'l' });
    const n1 = s.text(110, 548, 'Shivansh Shrivastava <span class="dim">&nbsp;24115091</span>', { size: 30, anchor: 'l' });
    const n2 = s.text(110, 594, 'Yash V. Awasthi <span class="dim">&nbsp;24115111</span>', { size: 30, anchor: 'l' });
    return [async () => {
      await all(fadeIn(logo, .6), write(inst, .8)); await create(rule, .5);
      await write(t, 1.1); await fadeIn(sub, .6, { shift: [0, 10] });
      await fadeIn([h1, n1, n2], .8, { lag: .4, shift: [0, 8] });
      const ctx = await cloud3D(s, 820, 110, 760, 700, { random: true });
      if (ctx) { await fadeIn(ctx.box, .6); await ctx.toClusters(2.6); }
    }];
  }
});

/* ===== 2. Roadmap ===== */
SLIDES.push({
  section: 'Introduction', title: 'Roadmap: from N-grams to skip-gram', build(s) {
    s.title('Introduction', 'Roadmap: from N-grams to skip-gram');
    const items = [
      ['1', 'N-gram models'], ['2', 'Word vectors'], ['3', 'Distributional hypothesis'], ['4', 'Context windows'], ['5', 'The skip-gram model'],
      ['6', 'Architecture'], ['7', 'Probability model'], ['8', 'Objective and loss'], ['9', 'Optimisation'], ['10', 'Negative sampling'],
      ['11', 'Subsampling'], ['12', 'Using embeddings'], ['13', 'Summary'], ['', 'Workshop']];
    const xs = [210, 505, 800, 1095, 1390];
    const pos = items.map((_, i) => i < 5 ? [xs[i], 270] : i < 10 ? [xs[9 - i], 450] : [xs[i - 10], 630]);
    const P = items.map(([n, l], i) => s.pill(...pos[i], (n ? `<span class="dim">${n}</span>&nbsp; ` : '') + l, { size: 21, sans: true, minW: 240, h: 56, rx: 28 }));
    const ar = P.slice(1).map((b, k) => { const a = P[k]; const same = a.cy === b.cy; return same ? s.arrow(a.cx < b.cx ? a.right + 4 : a.left - 4, a.cy, a.cx < b.cx ? b.left - 4 : b.right + 4, b.cy, { color: C.lgrey, width: 2.5, head: 10 }) : s.arrow(a.cx, a.bot + 4, b.cx, b.top - 4, { color: C.lgrey, width: 2.5, head: 10 }); });
    const D = s.defs([
      ['Language model', 'A probability distribution over word sequences: it scores how likely a sentence is, or predicts the next word.'],
      ['Word embedding', 'A dense, low-dimensional vector learned for each word, so that words used in similar ways get similar vectors.'],
      ['Skip-gram', 'A word2vec model that learns embeddings by predicting the words around each center word.']]);
    return [
      async () => { await s.intro(); for (let i = 0; i < P.length; i++) await all(fadeIn(P[i].els, .22), i ? create(ar[i - 1], .18) : null); },
      async () => { await tint(P[0], C.orange, .4); await tint(P[4], C.blue, .4, { solid: true }); await s.showDefs(D); }
    ];
  }
});

/* ===== 3. N-gram language model ===== */
SLIDES.push({
  section: '1 · N-gram models', title: 'N-gram language models', build(s) {
    s.title('1 · N-gram models', 'N-gram language models');
    const f1 = s.tex(800, 205, R`P(w_1,\dots,w_n)=\prod_{t=1}^{n}P(w_t\mid w_1,\dots,w_{t-1})`, { size: 34 });
    const W = s.wordRow('the cat sat on the warm mat'.split(' '), { y: 335, size: 34 });
    const nl = s.text(800, 268, '', { size: 22, sans: true, color: C.blue });
    const fr = s.rect(0, W[0].top - 12, 10, W[0].height + 24, { stroke: C.blue, width: 3, rx: 14, dash: '9 7' });
    const factor = s.tex(800, 450, '', { size: 32 });
    const hist = s.text(800, 500, '', { size: 21, sans: true, color: C.grey });
    const f2 = s.tex(800, 610, R`P(w_t\mid w_1,\dots,w_{t-1})\;\approx\;P(w_t\mid \cblue{w_{t-N+1},\dots,w_{t-1}})`, { size: 32 });
    const D = s.defs([
      ['N-gram', 'A run of N consecutive words. An N-gram model predicts each word from the N − 1 words before it.'],
      ['Chain rule', 'Exact identity: a sentence’s probability is the product of each word’s probability given all earlier words.'],
      ['History', 'The words before position t that the prediction is conditioned on.'],
      ['Markov assumption', 'The next word depends only on the last N − 1 words, not the whole history.']]);
    const fac = (t, a) => R`P(\corange{\text{${W[t].w}}}\mid \cblue{\text{${W.slice(a, t).map(x => x.w).join('\\ ')}}})`;
    async function sweep(N) {
      nl.textContent = N === 2 ? 'bigram, N = 2: remember 1 word' : 'trigram, N = 3: remember 2 words'; show(nl, fr);
      for (let t = N - 1; t < W.length; t++) {
        const a = W[t - N + 1], b = W[t - 1]; s.setTex(factor, fac(t, t - N + 1)); hist.textContent = `history length ${N - 1}`;
        await all(attrT(fr, { x: a.left - 9, width: b.right - a.left + 18 }, .4), W.map((w, i) => tint(w, i === t ? C.orange : (i >= t - N + 1 && i < t ? C.blue : null), .3)));
        await wait(.4);
      }
    }
    return [
      async () => { await s.intro(); await fadeIn(W.flatMap(w => w.els), .7, { lag: .4, shift: [0, 10] }); await s.showDefs(D, [0]); },
      async () => { await write(f1, 1.3); await s.showDefs(D, [1]); },
      async () => {
        show(factor, hist); await s.showDefs(D, [2]);
        for (let t = 1; t < W.length; t++) {
          s.setTex(factor, fac(t, 0)); hist.textContent = `history length ${t}`;
          await all(W.map((w, i) => tint(w, i < t ? C.blue : i === t ? C.orange : null, .3))); await wait(.6);
        }
      },
      async () => { await write(f2, 1.1); await s.showDefs(D, [3]); fr.setAttribute('x', W[0].left - 9); fr.setAttribute('width', W[0].width + 18); await sweep(2); },
      async () => sweep(3)
    ];
  }
});

/* ===== 4. Counting ===== */
SLIDES.push({
  section: '1 · N-gram models', title: 'Estimation by counting', build(s) {
    s.title('1 · N-gram models', 'Estimation by counting (maximum likelihood)');
    const tag = s.text(150, 196, '<span class="tag">corpus</span>', { anchor: 'l' });
    const lines = ['i like nlp', 'i like deep learning', 'i enjoy flying'].map((l, k) => s.wordRow(l.split(' '), { y: 250 + k * 74, left: 150, size: 28 }));
    const f = s.tex(1150, 240, R`P(w_t\mid w_{t-1})=\dfrac{\text{count}(w_{t-1},\,w_t)}{\text{count}(w_{t-1})}`, { size: 32 });
    const exs = (n, d, r = '') => R`P(\text{like}\mid\text{i})=\dfrac{\text{count}(\cblue{\text{i}}\ \corange{\text{like}})}{\text{count}(\cblue{\text{i}})}=\dfrac{${n}}{${d}}${r}`;
    const ex = s.tex(1150, 370, exs('?', '?'), { size: 30 });
    const bt = s.tex(1190, 480, R`P(\,\cdot\mid\text{i}\,)`, { size: 24, color: C.grey });
    const B = s.bars({ x: 930, w: 520, base: 700, scale: 180, values: [2 / 3, 1 / 3, 0, 0, 0], labels: ['like', 'enjoy', 'nlp', 'deep', 'flying'], colors: [C.orange, C.orange, C.lgrey, C.lgrey, C.lgrey], labelSize: 20 });
    const D = s.defs([
      ['Corpus', 'The collection of text a model is trained on.'],
      ['Maximum likelihood estimation', 'Choose the probabilities that make the observed corpus most likely. For N-grams the answer is a ratio of counts.'],
      ['Closed form', 'A solution written directly as a formula: count once and divide, with no iterative training.']]);
    return [
      async () => { await s.intro(); await fadeIn(tag, .4); for (const l of lines) await fadeIn(l.flatMap(w => w.els), .45, { lag: .3 }); await s.showDefs(D, [0]); },
      async () => { await write(f, 1.1); await fadeIn(ex, .4); await s.showDefs(D, [1]); },
      async () => { for (const k of [0, 1]) { await all(tint(lines[k][0], C.blue), tint(lines[k][1], C.orange)); s.setTex(ex, exs(k + 1, '?')); await indicate(ex, { scale: 1.05 }); } },
      async () => { await tint(lines[2][0], C.blue); s.setTex(ex, exs(2, 3, R`\approx 0.67`)); await indicate(ex, { scale: 1.05 }); },
      async () => { await fadeIn(bt, .4); await B.show(1); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 5. Limits of counting ===== */
SLIDES.push({
  section: '1 · N-gram models', title: 'Where counting breaks', build(s) {
    s.title('1 · N-gram models', 'Where counting breaks');
    const dv = [s.line(800, 160, 800, 740, { stroke: C.grid, width: 2 }), s.line(80, 452, 1520, 452, { stroke: C.grid, width: 2 })];
    const H = (x, y, t) => s.text(x, y, t, { sans: true, size: 21, weight: 600, anchor: 'l' });
    const h1 = H(100, 182, '1 · Data sparsity');
    const gA = s.g(); const r = rng(3);
    for (let i = 0; i < 14; i++) for (let j = 0; j < 16; j++) s.rect(100 + j * 14, 212 + i * 14, 12, 12, { parent: gA, fill: r() < .07 ? C.blue : C.faint, rx: 2 });
    const a1 = s.tex(360, 245, R`\text{count}(\text{i enjoy nlp}) = 0`, { size: 25, anchor: 'l' });
    const a2 = s.tex(360, 295, R`\Rightarrow\ \cred{P = 0}`, { size: 27, anchor: 'l' });
    const a3 = s.note(360, 365, 'A perfectly valid sentence gets zero probability. Smoothing only patches it.', { w: 400, size: 20 });
    const h2 = H(840, 182, '2 · Combinatorial explosion');
    const b0 = s.note(840, 212, `V = 10,000 words gives V${sup('N')} possible N-grams`, { size: 19, w: 600, color: C.grey });
    const B = s.bars({ x: 880, w: 520, base: 420, scale: 8.2, values: [4, 8, 12, 16, 20], labels: ['N=1', 'N=2', 'N=3', 'N=4', 'N=5'], color: C.purple, fmt: v => '10' + sup(Math.round(v)), labelSize: 15, labelGap: 17, sansLabels: true, valSize: 18 });
    const h3 = H(100, 482, '3 · Short memory');
    const Wc = s.wordRow('the keys i left in the car are lost'.split(' '), { y: 610, left: 100, size: 22, gap: 8, pad: 10 });
    const frc = s.rect(Wc[5].left - 6, Wc[5].top - 8, Wc[6].right - Wc[5].left + 12, Wc[5].height + 16, { stroke: C.blue, width: 2.5, rx: 10, dash: '7 6' });
    const arc = s.path(`M${Wc[1].cx},${Wc[1].top - 4} Q${(Wc[1].cx + Wc[7].cx) / 2},${Wc[1].top - 80} ${Wc[7].cx},${Wc[7].top - 4}`, { stroke: C.red, width: 2.5, dash: '8 6' });
    const c1 = s.note(100, 690, `A trigram sees only <span class="hl-b">“the car”</span> before <span class="hl-o">“are”</span>; the agreement with <span class="hl-r">“keys”</span> is out of reach.`, { w: 660, size: 20 });
    const h4 = H(840, 482, '4 · No notion of similarity');
    const pc = s.pill(900, 560, 'cat', { size: 26 }), pd = s.pill(900, 640, 'dog', { size: 26 });
    const ic = s.text(950, 560, '= symbol #3017', { size: 21, sans: true, color: C.grey, anchor: 'l' });
    const id = s.text(950, 640, '= symbol #8122', { size: 21, sans: true, color: C.grey, anchor: 'l' });
    const d1 = s.note(1150, 560, `seen: “the cat sat” <span class="hl-g">✓</span>`, { w: 360, size: 21 });
    const d2 = s.note(1150, 640, `unseen: “the dog sat”: <span class="hl-r">nothing transfers</span>`, { w: 360, size: 21 });
    const D = s.defs([
      ['Data sparsity', 'Most valid word sequences never appear in the corpus, so their counts are zero.'],
      ['Smoothing', 'Moving a little probability to unseen N-grams (add-one, backoff). It patches zeros, not the cause.'],
      ['Long-range dependency', 'A word that depends on another word further back than the N-gram window.'],
      ['Generalisation', 'Using what was learned about one case for similar unseen cases.']]);
    return [
      async () => { await s.intro(); await create(dv, .7); },
      async () => { await fadeIn(h1, .4); await fadeIn(gA, .5); await write(a1, .7); await fadeIn([a2, a3], .5, { lag: .4 }); await s.showDefs(D, [0, 1]); },
      async () => { await fadeIn([h2, b0], .5); await B.show(1.3); },
      async () => { await fadeIn(h3, .4); await fadeIn(Wc.flatMap(w => w.els), .5, { lag: .3 }); await all(create(frc, .5), tint(Wc[7], C.orange), tint(Wc[5], C.blue), tint(Wc[6], C.blue)); await all(create(arc, .8), tint(Wc[1], C.red)); await fadeIn(c1, .5); await s.showDefs(D, [2]); },
      async () => { await fadeIn(h4, .4); await fadeIn([...pc.els, ...pd.els, ic, id], .6, { lag: .3 }); await fadeIn([d1, d2], .6, { lag: .5 }); await s.showDefs(D, [3]); }
    ];
  }
});

/* ===== 6. One-hot ===== */
SLIDES.push({
  section: '2 · Word vectors', title: 'One-hot encoding', build(s) {
    s.title('2 · Word vectors', 'One-hot encoding');
    const vocab = ['apple', 'car', 'cat', 'dog', 'king', 'queen', 'run', 'zebra'];
    const Y = i => 205 + i * 50;
    const vl = vocab.map((w, i) => s.text(700, Y(i), w, { size: 25, anchor: 'r' }));
    const il = vocab.map((w, i) => s.text(612, Y(i), String(i), { size: 17, sans: true, color: '#b0b5bc', anchor: 'r' }));
    const cols = [['cat', 2, C.blue, 790], ['dog', 3, C.orange, 900], ['car', 1, C.green, 1010]].map(([w, k, col, x]) => {
      const g = s.g();
      const cells = vocab.map((_, i) => s.rect(x - 23, Y(i) - 21, 46, 42, { parent: g, stroke: C.lgrey, width: 1.5, fill: i === k ? col : '#ffffff', rx: 4 }));
      const nums = vocab.map((_, i) => s.text(x, Y(i), i === k ? '1' : '0', { size: 21, color: i === k ? '#fff' : '#9aa0a8' }));
      return { g, nums, cells, head: s.text(x, 160, w, { size: 27, color: col }) };
    });
    const rp = [
      s.tex(1110, 240, R`\cblue{\text{cat}}\cdot\corange{\text{dog}} = 0`, { size: 28, anchor: 'l' }),
      s.tex(1110, 300, R`\cblue{\text{cat}}\cdot\cgreen{\text{car}} = 0`, { size: 28, anchor: 'l' }),
      s.tex(1110, 370, R`\lVert\cblue{\text{cat}}-\corange{\text{dog}}\rVert=\lVert\cblue{\text{cat}}-\cgreen{\text{car}}\rVert=\sqrt2`, { size: 26, anchor: 'l' }),
      s.note(1110, 445, 'Every pair of words is exactly as (un)related as every other pair.', { w: 420, size: 22, color: C.grey })];
    const bl = s.bullets(90, 240, ['Length = vocabulary size V, often 10⁴ to 10⁵', 'Exactly one non-zero entry', 'All vectors orthogonal and equidistant', 'Encodes <b>identity</b>, not meaning'], { w: 400, dy: 84, size: 23 });
    const cap = s.caption('One-hot vectors are pure labels: their geometry carries no information about similarity.', { y: 660 });
    const D = s.defs([
      ['Vocabulary', 'The set of distinct words the model knows; V is its size.'],
      ['One-hot vector', 'A V-dimensional vector with a single 1 at the word’s index and 0 everywhere else.'],
      ['Orthogonal', 'Two vectors whose dot product is zero: at right angles, sharing nothing.']]);
    return [
      async () => { await s.intro(); await fadeIn([...vl, ...il], .6, { lag: .4 }); await s.showDefs(D, [0]); },
      async () => { const c = cols[0]; await all(fadeIn(c.head, .4), create(c.g, .8, { lag: .3 }), fadeIn(c.nums, .8, { lag: .3 })); await indicate(c.cells[2]); await s.showDefs(D, [1]); },
      async () => { for (const c of cols.slice(1)) await all(fadeIn(c.head, .3), create(c.g, .6, { lag: .3 }), fadeIn(c.nums, .6, { lag: .3 })); },
      async () => { for (const e of rp) await write(e, .6); await s.showDefs(D, [2]); },
      async () => { await fadeIn(bl, .8, { lag: .4, shift: [-10, 0] }); await fadeIn(cap, .5); }
    ];
  }
});

/* ===== 7. Orthogonal vs dense (3D) ===== */
SLIDES.push({
  section: '2 · Word vectors', title: 'Sparse labels vs a dense, meaningful space', build(s) {
    s.title('2 · Word vectors', 'Sparse labels vs a dense, meaningful space');
    const cap = s.caption('One-hot: one axis per word, every tip √2 from every other. Drag to rotate.');
    const leg = s.text(1500, 176, 'distances on dashed edges', { size: 19, sans: true, color: C.grey, anchor: 'r' });
    const one = { cat: [1, 0, 0], dog: [0, 1, 0], car: [0, 0, 1] };
    const dense = { cat: [1.15, 0.95, 0.2], dog: [0.95, 1.12, 0.32], car: [0.15, 0.3, 1.3] };
    const cols = { cat: C.blue, dog: C.orange, car: C.green };
    const pairs = [['cat', 'dog'], ['cat', 'car'], ['dog', 'car']];
    const D = s.defs([
      ['Sparse representation', 'Very high-dimensional and almost all zeros, with no built-in similarity (one-hot vectors, count tables).'],
      ['Dense representation', 'Low-dimensional (often 50 to 300) with every entry a real number; distance can reflect meaning.'],
      ['Dimension', 'One coordinate of a vector. In embeddings the dimensions are learned, not hand-designed.']]);
    let ctx, V;
    const place = P => {
      for (const w in P) { V[w].a.setTo([0, 0, 0], P[w]); V[w].s.position.set(...P[w]); V[w].l.position.set(P[w][0] * 1.12, P[w][1] * 1.12 + .1, P[w][2] * 1.12); }
      pairs.forEach(([a, b], k) => {
        const A = P[a], B = P[b]; V.e[k].setTo(A, B);
        V.el[k].position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + .08, (A[2] + B[2]) / 2);
        V.el[k].el.textContent = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]).toFixed(2);
      });
    };
    return [
      async () => {
        await s.intro();
        ctx = await s.three(150, 140, 1300, 590, { cam: [3.3, 2.4, 3.9], target: [.45, .45, .45] });
        if (!ctx) return;
        ctx.axes(1.55, { neg: 0, labels: ['x_1', 'x_2', 'x_3'] }); ctx.grid(3, 12, 0).position.set(.5, 0, .5);
        V = { e: [], el: [] };
        for (const w in one) V[w] = { a: ctx.arrow([0, 0, 0], one[w], cols[w], { r: .02 }), s: ctx.sphere(one[w], .05, cols[w]), l: ctx.label(w, one[w], { color: cols[w], size: 26 }) };
        pairs.forEach(() => { V.e.push(ctx.line([0, 0, 0], [1, 0, 0], '#8a9099', { dashed: true })); V.el.push(ctx.label('', [0, 0, 0], { color: C.grey, size: 18 })); });
        place(one); await fadeIn(ctx.box, .7); await all(fadeIn([cap, leg], .5), s.showDefs(D, [0]));
      },
      async () => {
        if (!ctx) return;
        await swapText(cap, 'Dense: positions are learned, so <span class="hl-b">cat</span> and <span class="hl-o">dog</span> sit close while <span class="hl-g">car</span> sits apart.');
        await tween(2.4, t => { const P = {}; for (const w in one) P[w] = one[w].map((v, i) => lerp(v, dense[w][i], t)); place(P); });
        await s.showDefs(D, [1, 2]);
      }
    ];
  }
});

/* ===== 8. Embedding space (3D) ===== */
SLIDES.push({
  section: '2 · Word vectors', title: 'A word embedding space', build(s) {
    s.title('2 · Word vectors', 'A word embedding space');
    const leg = CLUSTERS.map((c, i) => s.text(1500, 190 + i * 34, `${c.name} <span style="color:${c.color}">●</span>`, { size: 19, sans: true, color: C.grey, anchor: 'r' }));
    const note = s.note(90, 330, 'Words become points. Training moves words used in similar ways close together. Drag to rotate.', { w: 260, size: 21, color: C.grey });
    const D = s.defs([
      ['Word embedding', 'A learned dense vector for a word. In skip-gram it is the word’s row of W.'],
      ['Latent feature', 'A hidden dimension discovered by training; not labelled and usually not directly interpretable.'],
      ['Cluster', 'A group of points lying close together; here, words used in similar contexts.']]);
    let ctx;
    return [
      async () => { await s.intro(); ctx = await cloud3D(s, 330, 130, 1000, 610, { random: true, size: 18 }); if (ctx) await fadeIn(ctx.box, .6); await all(fadeIn(note, .5), s.showDefs(D, [0])); },
      async () => { await fadeIn(leg, .6, { lag: .4 }); if (ctx) await ctx.toClusters(3); await s.showDefs(D, [1, 2]); }
    ];
  }
});

/* ===== 9. Distributional hypothesis ===== */
SLIDES.push({
  section: '3 · Distributional hypothesis', title: 'You shall know a word by the company it keeps', build(s) {
    s.title('3 · Distributional hypothesis', 'Meaning from context');
    const q = s.text(800, 200, '“You shall know a word by the company it keeps.”', { size: 40, italic: true });
    const qa = s.text(800, 250, 'J. R. Firth, 1957', { size: 19, sans: true, color: C.grey });
    const L = [['dog', 390, C.orange], ['puppy', 500, C.orange], ['car', 610, C.blue]].map(([w, y, c]) => ({ ...s.pill(520, y, w, { size: 28, minW: 130 }), col: c }));
    const ctxW = ['barks', 'fed', 'vet', 'walk', 'park', 'fuel', 'drive'];
    const Rr = ctxW.map((w, i) => s.pill(1080, 335 + i * 56, w, { size: 23, minW: 120 }));
    const links = { dog: ['barks', 'fed', 'vet', 'walk', 'park'], puppy: ['barks', 'fed', 'vet', 'walk'], car: ['park', 'fuel', 'drive'] };
    const Ed = {};
    L.forEach(l => { Ed[l.w] = links[l.w].map(c => { const r = Rr[ctxW.indexOf(c)]; return s.path(`M${l.right},${l.cy} C${l.right + 160},${l.cy} ${r.left - 160},${r.cy} ${r.left},${r.cy}`, { stroke: l.col, width: 2.4, op: .85 }); }); });
    const n1 = s.note(1210, 420, '<span class="hl-o">dog</span> and <span class="hl-o">puppy</span> share 4 contexts: they will get similar vectors.', { w: 320, size: 22 });
    const n2 = s.note(1210, 600, '<span class="hl-b">car</span> shares only “park”.', { w: 320, size: 22 });
    const D = s.defs([
      ['Distributional hypothesis', 'Words that occur in similar contexts tend to have similar meanings. The foundation of skip-gram.'],
      ['Context', 'The words surrounding a given word in running text.'],
      ['Co-occurrence', 'Two words appearing near each other, for example inside the same window.']]);
    return [
      async () => { await s.intro(); await write(q, 1.5); await fadeIn(qa, .4); await s.showDefs(D, [0]); },
      async () => { await fadeIn([...L.flatMap(l => l.els), ...Rr.flatMap(r => r.els)], .7, { lag: .4 }); await s.showDefs(D, [1]); },
      async () => { for (const l of L) { await tint(l, l.col, .25); await create(Ed[l.w], .7, { lag: .3 }); } await s.showDefs(D, [2]); },
      async () => { await all(['barks', 'fed', 'vet', 'walk'].map(w => tint(Rr[ctxW.indexOf(w)], C.gold, .4)), opacityT(Ed.car, .25, .4)); await fadeIn(n1, .5); },
      async () => { await all(opacityT(Ed.car, .85, .3), tint(Rr[ctxW.indexOf('park')], C.blue)); await fadeIn(n2, .4); }
    ];
  }
});

/* ===== 10. Window and pairs ===== */
SLIDES.push({
  section: '4 · Context windows', title: 'Center word, context window, training pairs', build(s) {
    s.title('4 · Context windows', 'Center word, context window, training pairs');
    const W = s.wordRow(FOX, { y: 240, size: 34 });
    const m = 2;
    const fr = s.rect(0, W[0].top - 14, 10, W[0].height + 28, { stroke: C.teal, width: 3, rx: 14, dash: '9 7' });
    const ml = s.text(0, W[0].top - 34, 'window m = 2', { size: 20, sans: true, color: C.teal });
    const pos = W.map(w => s.tex(w.cx, 304, '', { size: 19, color: C.grey }));
    const setFrame = (t, dur) => {
      const a = W[Math.max(0, t - m)], b = W[Math.min(W.length - 1, t + m)], x = a.left - 9, w = b.right - a.left + 18;
      return all(attrT(fr, { x, width: w }, dur), moveText(ml, x + w / 2, ml._y, dur));
    };
    const arcs = [1, 2, 4, 5].map(j => { const c = W[3], w = W[j], h = 16 + Math.abs(j - 3) * 16; return s.path(`M${c.cx},${c.bot + 4} Q${(c.cx + w.cx) / 2},${c.bot + h * 2.2} ${w.cx},${w.bot + 4}`, { stroke: C.teal, width: 2.5 }); });
    const chip = (c, o) => `(<span class="hl-b">${FOX[c]}</span>, <span class="hl-t">${FOX[o]}</span>)`;
    const first = [1, 2, 4, 5].map((j, k) => s.text(470 + k * 220, 410, chip(3, j), { size: 27 }));
    const all30 = []; for (let t = 0; t < 9; t++) for (let j = Math.max(0, t - m); j <= Math.min(8, t + m); j++) if (j !== t) all30.push([t, j]);
    const chips = all30.map(([c, o], k) => s.text(170 + (k % 6) * 210, 455 + Math.floor(k / 6) * 40, chip(c, o), { size: 20, anchor: 'l' }));
    const cnt = s.text(1460, 405, '', { size: 23, sans: true, color: C.grey, anchor: 'r' });
    const ff = s.tex(800, 690, R`n=9\ \text{words},\ s=2:\quad \text{pairs}=s\,(2n-s-1)=2\,(18-2-1)=\mathbf{30}`, { size: 27 });
    const D = s.defs([
      ['Center word', 'The word at the current position t whose neighbours are predicted.'],
      ['Context window', 'Positions t − m to t + m around the center, excluding t; m is the window size.'],
      ['Training pair', '(center, context): one example for every neighbour inside the window.'],
      ['Self-supervised', 'The labels come from the raw text itself; no human annotation is needed.']]);
    return [
      async () => { await s.intro(); await fadeIn(W.flatMap(w => w.els), .7, { lag: .4 }); },
      async () => {
        await tint(W[3], C.blue, .4, { solid: true });
        ['t-2', 't-1', 't', 't+1', 't+2'].forEach((l, k) => s.setTex(pos[k + 1], l));
        await setFrame(3, 0); await all(create(fr, .7), fadeIn(ml, .5), fadeIn(pos.slice(1, 6), .5, { lag: .3 }));
        await all([1, 2, 4, 5].map(j => tint(W[j], C.teal, .4))); await s.showDefs(D, [0, 1]);
      },
      async () => { await create(arcs, 1, { lag: .3 }); await fadeIn(first, .6, { lag: .4, shift: [0, 10] }); await s.showDefs(D, [2]); },
      async () => {
        await all(fadeOut(arcs, .3), fadeOut(first, .3), fadeOut(pos, .3)); show(cnt);
        let k = 0;
        for (let t = 0; t < 9; t++) {
          await all(setFrame(t, .35), W.map((w, i) => i === t ? tint(w, C.blue, .25, { solid: true }) : tint(w, Math.abs(i - t) <= m ? C.teal : null, .25)));
          const n = all30.filter(p => p[0] === t).length;
          await fadeIn(chips.slice(k, k + n), .35, { lag: .4, shift: [0, 6] }); k += n; cnt.textContent = `${k} pairs`;
        }
        await s.showDefs(D, [3]);
      },
      async () => write(ff, 1)
    ];
  }
});

/* ===== 11. Window size ===== */
SLIDES.push({
  section: '4 · Context windows', title: 'Window size changes what “similar” means', build(s) {
    s.title('4 · Context windows', 'Window size changes what “similar” means');
    const W = s.wordRow('a vet said my dog chased the cat across the park'.split(' '), { y: 250, size: 29, gap: 10 });
    const c = 4;
    const frame = (m, col, pad) => { const a = W[Math.max(0, c - m)], b = W[Math.min(W.length - 1, c + m)]; return s.rect(a.left - pad, a.top - pad, b.right - a.left + pad * 2, a.height + pad * 2, { stroke: col, width: 3, rx: 14, dash: '9 7' }); };
    const f2 = frame(2, C.teal, 10), f8 = frame(8, C.purple, 22);
    const card = (x, col, head, body) => [s.rect(x, 340, 640, 240, { stroke: col, width: 2, rx: 16, fill: mix(col, '#ffffff', .94) }), s.text(x + 30, 382, head, { anchor: 'l', size: 25, color: col }), s.note(x + 30, 490, body, { w: 580, size: 22 })];
    const k1 = card(120, C.teal, 'Small window, about 2 to 5', 'Neighbours are grammatical partners: <i>my dog</i>, <i>dog chased</i>.<br><br><span class="hl-t">dog</span> ≈ cat, puppy, horse');
    const k2 = card(840, C.purple, 'Large window, about 5 to 10+', 'Neighbours share a topic: <i>vet</i>, <i>park</i>, <i>cat</i>.<br><br><span class="hl-p">dog</span> ≈ vet, leash, park, bark');
    const cap = s.caption('Near a sentence boundary the window is truncated: the first word has only right-hand neighbours.', { y: 660 });
    const D = s.defs([
      ['Syntactic similarity', 'Words that play the same grammatical role, like dog, cat and horse after “my”.'],
      ['Topical similarity', 'Words that belong to the same subject or scene, like dog, vet, leash and park.'],
      ['Truncated window', 'At a sentence edge there are fewer neighbours, so the window is cut short.']]);
    return [
      async () => { await s.intro(); await fadeIn(W.flatMap(w => w.els), .6, { lag: .4 }); await tint(W[c], C.blue, .4, { solid: true }); },
      async () => { await all(create(f2, .7), [2, 3, 5, 6].map(j => tint(W[j], C.teal))); await create(k1, .8); await s.showDefs(D, [0]); },
      async () => { await create(f8, .8); await create(k2, .8); await s.showDefs(D, [1]); },
      async () => {
        await all(fadeOut(f8, .3), W.map(w => tint(w, null, .3)));
        await all(tint(W[0], C.blue, .3, { solid: true }), [1, 2].map(j => tint(W[j], C.teal)), attrT(f2, { x: W[0].left - 10, width: W[2].right - W[0].left + 20 }, .6));
        await fadeIn(cap, .5); await s.showDefs(D, [2]);
      }
    ];
  }
});

/* ===== 12. Dynamic window ===== */
SLIDES.push({
  section: '4 · Context windows', title: 'Dynamic window: nearer words count more', build(s) {
    s.title('4 · Context windows', 'Dynamic window: nearer words count more');
    const m = 5, xs = d => 800 + d * 110, y = 235;
    const slots = []; for (let d = -m; d <= m; d++) slots.push({ d, ...s.pill(xs(d), y, d === 0 ? 'c' : String(Math.abs(d)), { size: 25, minW: 68, tex: true }) });
    const fr = s.rect(xs(0) - 40, y - 33, 80, 66, { stroke: C.teal, width: 3, rx: 14, dash: '8 6' });
    const bl = s.text(800, 172, '', { size: 21, sans: true, color: C.teal });
    const B = s.bars({ x: 330, w: 780, base: 640, scale: 210, values: [0, 0, 0, 0, 0], labels: ['d = 1', 'd = 2', 'd = 3', 'd = 4', 'd = 5'], color: C.teal, sansLabels: true, labelSize: 19 });
    const exp = [1, .8, .6, .4, .2];
    const marks = exp.map((v, i) => s.line(B.cx(i) - 60, 640 - v * 210, B.cx(i) + 60, 640 - v * 210, { stroke: C.ink, width: 2.5, dash: '6 5' }));
    const f = s.tex(1330, 400, R`P(\text{distance } d \text{ used}) = \frac{m-d+1}{m}`, { size: 26 });
    const ns = s.text(1330, 460, '', { size: 21, sans: true, color: C.grey });
    const yl = s.text(330, 385, 'how often each distance was used', { size: 19, sans: true, color: C.grey, anchor: 'l' });
    const D = s.defs([
      ['Dynamic window', 'word2vec draws a smaller window for each center word, so nearer neighbours are used more often.'],
      ['Effective window b', 'The window size actually used at one position, drawn uniformly from 1 to m.'],
      ['Hyperparameter', 'A setting chosen before training, like m, rather than learned from data.']]);
    return [
      async () => { await s.intro(); await fadeIn(slots.flatMap(q => q.els), .6, { lag: .4 }); await tint(slots[m], C.blue, .3, { solid: true }); await all(B.show(.5), fadeIn(yl, .4)); show(B.vals); await s.showDefs(D, [2]); },
      async () => {
        const r = rng(11), hits = [0, 0, 0, 0, 0]; show(fr, bl, ns); await s.showDefs(D, [0, 1]);
        for (let k = 1; k <= 60; k++) {
          const b = 1 + Math.floor(r() * m); for (let d = 1; d <= b; d++) hits[d - 1]++;
          bl.textContent = `sampled b = ${b}`; ns.textContent = `${k} samples`;
          const dur = k < 6 ? .45 : k < 15 ? .18 : .05;
          await all(attrT(fr, { x: xs(-b) - 40, width: xs(b) - xs(-b) + 80 }, dur), slots.map(q => tint(q, q.d === 0 ? C.blue : Math.abs(q.d) <= b ? C.teal : null, dur * .8, { solid: q.d === 0 })), B.set(hits.map(h => h / k), dur));
        }
      },
      async () => { await create(marks, .6, { lag: .3 }); await write(f, .8); }
    ];
  }
});
