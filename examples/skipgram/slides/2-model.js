'use strict';
/* Slides 13-24: the skip-gram model, architecture, probability model, loss, gradient descent. */

const VOC = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'];
const VFOX = [0.8, -0.3, 0.5];
const UCTX = { the: [0.2, 0.1, 0.3], quick: [0.9, -0.2, 0.4], brown: [0.7, 0.1, 0.6], fox: [-0.1, 0.4, 0.0], jumps: [0.6, -0.5, 0.2], over: [0.3, 0.2, 0.5], lazy: [-0.6, 0.3, -0.2], dog: [-0.3, -0.1, -0.4] };
const ZFOX = VOC.map(w => 2 * dot(UCTX[w], VFOX));
const PFOX = softmax(ZFOX);

/* ===== 13. Skip-gram ===== */
SLIDES.push({
  section: '5 · The skip-gram model', title: 'Skip-gram: predict the neighbours', build(s) {
    s.title('5 · The skip-gram model', 'Skip-gram: predict the neighbours');
    const c = s.pill(800, 330, 'fox', { size: 40, minW: 150 });
    const SP = [[330, 230], [330, 430], [1270, 230], [1270, 430]], lab = ['t-2', 't-1', 't+1', 't+2'], ans = ['quick', 'brown', 'jumps', 'over'];
    const S = SP.map(([x, y]) => s.pill(x, y, '?', { size: 34, minW: 150 }));
    const ar = SP.map(([x, y]) => s.arrow(x < 800 ? c.left - 6 : c.right + 6, 330 + (y < 330 ? -12 : 12), x < 800 ? x + 85 : x - 85, y, { color: C.teal, width: 3 }));
    const P = SP.map(([x, y], i) => s.tex(x, y + 50, R`P(w_{${lab[i]}}\mid \cblue{\text{fox}})`, { size: 23, color: C.grey }));
    const d = s.note(150, 610, 'Unlike an N-gram model it looks at <b>both sides</b> of the center word, and it predicts neighbours rather than the next word.', { w: 600, size: 23 });
    const p = s.note(860, 610, 'After training the predictions are thrown away. The learned word vectors are the real product.', { w: 600, size: 23 });
    const D = s.defs([
      ['Skip-gram', 'Given a center word, predict each word in its context window (Mikolov et al., 2013).'],
      ['word2vec', 'Google’s 2013 toolkit for learning word embeddings. It contains two models: skip-gram and CBOW.'],
      ['Pretext task', 'A task solved only to force useful internal representations; its own outputs are discarded.']]);
    return [
      async () => { await s.intro(); await all(fadeIn(c.els, .5), tint(c, C.blue, .4, { solid: true })); await s.showDefs(D, [0]); },
      async () => { await all(create(ar, .7, { lag: .3 }), fadeIn(S.flatMap(q => q.els), .6, { lag: .3 })); await fadeIn(P, .5, { lag: .3 }); },
      async () => { for (let i = 0; i < 4; i++) { S[i].t.textContent = ans[i]; await tint(S[i], C.teal, .3); } await fadeIn(d, .5); await s.showDefs(D, [1]); },
      async () => { await fadeIn(p, .5); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 14. CBOW vs skip-gram ===== */
SLIDES.push({
  section: '5 · The skip-gram model', title: 'word2vec has two architectures', build(s) {
    s.title('5 · The skip-gram model', 'word2vec has two architectures');
    const ctxw = ['w_{t-2}', 'w_{t-1}', 'w_{t+1}', 'w_{t+2}'], ys = [215, 275, 335, 395], cy = 305;
    const L = ctxw.map((w, i) => s.pill(220, ys[i], w, { tex: true, size: 23, minW: 110 }));
    const sum = s.circle(420, cy, 30, { fill: C.faint, stroke: C.ink, width: 2 }), sl = s.text(420, cy, 'avg', { size: 19, sans: true });
    const out1 = s.pill(600, cy, 'w_t', { tex: true, size: 25, minW: 100 });
    const la = L.map(p => s.arrow(p.right + 4, p.cy, 392, cy, { color: C.teal, width: 2.2 }));
    const lb = s.arrow(452, cy, out1.left - 6, cy, { color: C.blue, width: 2.5 });
    const h1 = s.text(410, 168, 'CBOW: context ⇒ center', { size: 25 });
    const in2 = s.pill(1000, cy, 'w_t', { tex: true, size: 25, minW: 100 });
    const proj = s.circle(1180, cy, 30, { fill: C.faint, stroke: C.ink, width: 2 }), pl = s.tex(1180, cy, R`v_c`, { size: 21 });
    const R2 = ctxw.map((w, i) => s.pill(1380, ys[i], w, { tex: true, size: 23, minW: 110 }));
    const ra = R2.map(p => s.arrow(1210, cy, p.left - 6, p.cy, { color: C.teal, width: 2.2 }));
    const rb = s.arrow(in2.right + 4, cy, 1148, cy, { color: C.blue, width: 2.5 });
    const h2 = s.text(1190, 168, 'Skip-gram: center ⇒ context', { size: 25 });
    const tb = s.table(180, 460, [360, 520, 360], [
      ['', 'CBOW', 'Skip-gram'],
      ['Input', 'context words (vectors averaged)', 'center word'],
      ['Predictions per window', 'one', 'one per context word'],
      ['Training speed', 'faster', 'slower'],
      ['Shines on', 'frequent words, large data', 'rare words, smaller data']], { rh: 50, size: 21, sans: true });
    const D = s.defs([
      ['CBOW', 'Continuous bag of words: average the context vectors and predict the center word.'],
      ['Training signal', 'How many prediction errors, and so gradient updates, each occurrence of a word produces.'],
      ['Rare word', 'A word with few occurrences. Skip-gram gives it one update per neighbour, CBOW one per window.']]);
    return [
      async () => { await s.intro(); await fadeIn(h1, .4); await fadeIn(L.flatMap(p => p.els), .5, { lag: .3 }); L.forEach(p => tint(p, C.teal, 0)); await create(la, .6); await all(grow([sum], .4), fadeIn(sl, .3)); await create(lb, .4); await all(fadeIn(out1.els, .4), tint(out1, C.blue, .3, { solid: true })); await s.showDefs(D, [0]); },
      async () => { await fadeIn(h2, .4); await all(fadeIn(in2.els, .4), tint(in2, C.blue, .3, { solid: true })); await create(rb, .4); await all(grow([proj], .4), fadeIn(pl, .3)); await create(ra, .6); await fadeIn(R2.flatMap(p => p.els), .5, { lag: .3 }); R2.forEach(p => tint(p, C.teal, 0)); },
      async () => { for (let i = 0; i < tb.length; i++) await tb.reveal(i, .3); await s.showDefs(D, [1, 2]); }
    ];
  }
});

/* ===== 15. The network ===== */
SLIDES.push({
  section: '6 · Architecture', title: 'The network, neuron by neuron', build(s) {
    s.title('6 · Architecture', 'The network, neuron by neuron');
    const N = s.network([{ x: 400, n: 8, gap: 62 }, { x: 780, n: 3, gap: 86 }, { x: 1120, n: 8, gap: 62 }], { cy: 440 });
    const [I, Hd, O] = N.L;
    const heads = [[400, 'input · one-hot · V'], [780, 'hidden · linear · N'], [1120, 'output · scores · V'], [1370, 'softmax']].map(([x, t]) => s.text(x, 166, t, { size: 18, sans: true, color: C.grey, weight: 500 }));
    const wl = [s.tex(590, 200, R`\cblue{W}\in\mathbb{R}^{V\times N}`, { size: 21 }), s.tex(950, 200, R`\cteal{W'}\in\mathbb{R}^{N\times V}`, { size: 21 })];
    const inL = VOC.map((w, i) => s.text(362, I[i].y, w, { size: 21, anchor: 'r' }));
    const outL = VOC.map((w, i) => s.text(1156, O[i].y, w, { size: 19, anchor: 'l', color: C.grey }));
    const inV = VOC.map((w, i) => s.text(400, I[i].y, i === 3 ? '1' : '0', { size: 16, color: i === 3 ? '#fff' : '#9aa0a8', sans: true }));
    const hV = Hd.map((h, k) => s.text(780, h.y, fmt(VFOX[k], 1), { size: 15, sans: true, weight: 600 }));
    const oV = O.map((o, i) => s.text(1120, o.y, fmt(ZFOX[i], 1), { size: 14, sans: true, weight: 600 }));
    const bars = O.map((o, i) => s.rect(1250, o.y - 10, 0, 20, { fill: i === 1 ? C.green : C.orange, rx: 3, show: true }));
    const pv = O.map(() => s.text(1258, 0, '', { size: 17, sans: true, color: C.grey, anchor: 'l' }));
    O.forEach((o, i) => { pv[i].style.top = o.y + 'px'; });
    const id = s.axes({ x: 712, y: 610, w: 136, h: 80, xr: [-1, 1], yr: [-1, 1], tickSize: 14 });
    const idp = id.plot(x => x, { color: C.blue, width: 3 });
    const idl = s.tex(780, 712, R`f(h)=h\ \ \text{(no activation)}`, { size: 18, color: C.grey });
    const cap = s.caption('');
    const say = h => swapText(cap, h, .4);
    const D = s.defs([
      ['Neuron', 'A unit holding one number. Each input and output neuron stands for one vocabulary word.'],
      ['Hidden layer (linear)', 'N neurons with no activation function: the output is the plain weighted sum h = Wᵀx.'],
      ['Weight matrices', 'W (V × N) connects input to hidden; W′ (N × V) connects hidden to output.'],
      ['Embedding dimension N', 'Number of hidden neurons, which is also the length of every word vector.']]);
    return [
      async () => { await s.intro(); await N.show(1.4); await all(fadeIn(heads, .5, { lag: .3 }), fadeIn([...inL, ...outL], .6, { lag: .3 }), fadeIn(wl, .5)); await s.showDefs(D, [0, 2]); },
      async () => { show(cap); await say('The center word <span class="hl-b">fox</span> enters as a one-hot vector: a single 1 among V zeros.'); await all(fadeIn(inV, .5, { lag: .3 }), colorT(I[3].c, 'fill', C.blue, .5), colorT(inL[3], 'color', C.blue, .5)); },
      async () => {
        await say(`Only the edges leaving <span class="hl-b">fox</span> carry signal: the hidden layer receives row “fox” of W, the embedding ${T('\\vc')}.`);
        await opacityT(N.E[0].flat().filter((_, k) => Math.floor(k / 3) !== 3), .12, .5);
        N.E[0][3].forEach(e => { e.setAttribute('stroke', C.blue); e.setAttribute('stroke-width', 3); });
        await all(Hd.map(h => pulse(s, [[I[3].x, I[3].y], [h.x, h.y]], { color: C.blue, dur: .9 })));
        await all(Hd.map(h => colorT(h.c, 'fill', C.lblue, .4)), fadeIn(hV, .4));
        await all(id.show(.6), create(idp, .6), fadeIn(idl, .4)); await s.showDefs(D, [1, 3]);
      },
      async () => {
        await say(`Every output neuron computes a score ${T('z_w = \\uw\\cdot\\vc')}: how well word w fits as a neighbour of fox.`);
        N.E[1].flat().forEach(e => { e.setAttribute('stroke', C.teal); e.setAttribute('stroke-width', 1.8); });
        await all(Hd.flatMap(h => O.map(o => pulse(s, [[h.x, h.y], [o.x, o.y]], { color: C.teal, dur: 1, r: 4.5 }))));
        await all(O.map((o, i) => colorT(o.c, 'fill', diverge(ZFOX[i] / 2.5), .4)), fadeIn(oV, .4));
      },
      async () => {
        await say(`Softmax turns the V scores into probabilities ${T('P(w\\mid \\text{fox})')} that add up to 1.`); show(pv);
        await tween(1, t => bars.forEach((b, i) => { b.setAttribute('width', PFOX[i] * 620 * t); pv[i].style.left = (1258 + PFOX[i] * 620 * t) + 'px'; pv[i].textContent = fmt(PFOX[i] * t, 2); }));
      },
      async () => { await say(`The true neighbour is <span class="hl-g">quick</span>. Loss for this pair: ${T(`-\\log P(\\text{quick}\\mid\\text{fox}) = ${(-Math.log(PFOX[1])).toFixed(2)}`)}`); await all(colorT(outL[1], 'color', C.green, .4), indicate(bars[1], { scale: 1.12 })); },
      async () => {
        await say('Backpropagation sends the error back: only row “fox” of W and the columns of W′ change.');
        N.E[1].flat().forEach(e => e.setAttribute('stroke', C.purple));
        await all(O.flatMap(o => Hd.map(h => pulse(s, [[o.x, o.y], [h.x, h.y]], { color: C.purple, dur: .9, r: 4.5 }))));
        await all(Hd.map(h => pulse(s, [[h.x, h.y], [I[3].x, I[3].y]], { color: C.purple, dur: .7 }))); await indicate(I[3].c, { scale: 1.3 });
      }
    ];
  }
});

/* ===== 16. Lookup ===== */
SLIDES.push({
  section: '6 · Architecture', title: 'Multiplying by a one-hot vector is a lookup', build(s) {
    s.title('6 · Architecture', 'Multiplying by a one-hot vector is a lookup');
    const r = rng(5), Y0 = 185, CH = 46, YR = Y0 + 3 * CH + CH / 2;
    const Wd = VOC.map((w, i) => i === 3 ? VFOX : [0, 0, 0].map(() => Math.round((r() * 2 - 1) * 90) / 100));
    const xr = s.matrix(110, YR - 26, [VOC.map((_, i) => i === 3 ? 1 : 0)], { cw: 54, ch: 52, fmt: v => String(v), size: 22 });
    const xl = s.tex(110 + 54 * 4, YR - 62, R`x^{\top}\ (1\times V)`, { size: 23 });
    const times = s.tex(600, YR, R`\times`, { size: 38 });
    const M = s.matrix(660, Y0, Wd, { cw: 84, ch: CH, fmt: v => fmt(v, 2), size: 20 });
    const ml = s.tex(660 + 126, Y0 - 22, R`\cblue{W}\ (V\times N)`, { size: 23 });
    const rl = VOC.map((w, i) => s.text(924, Y0 + CH / 2 + i * CH, w, { size: 18, sans: true, color: C.grey, anchor: 'l' }));
    const eq = s.tex(1050, YR, '=', { size: 38 });
    const H = s.matrix(1110, YR - 26, [[0, 0, 0]], { cw: 84, ch: 52, fmt: () => '', size: 22 });
    const hl = s.tex(1110 + 126, YR - 62, R`h = \vc\ (1\times N)`, { size: 23 });
    const f = s.tex(800, 640, R`x^{\top}W \;=\; W_{\text{fox},\,:}\;=\;\vc`, { size: 38 });
    const D = s.defs([
      ['Matrix product xᵀW', 'Each output entry is a weighted sum down one column of W, with the weights taken from x.'],
      ['Row lookup', 'With a one-hot x, the sum keeps exactly one row of W. Real code simply indexes W[c].'],
      ['Embedding of a word', 'Its row of W, the center vector v<sub>c</sub>. It is also the hidden layer h.']]);
    return [
      async () => { await s.intro(); await all(xr.show(.8), fadeIn(xl, .5)); await fadeIn(times, .3); await all(M.show(1), fadeIn([ml, ...rl], .6, { lag: .3 })); await fadeIn(eq, .3); await all(H.show(.6), fadeIn(hl, .4)); await s.showDefs(D, [0]); },
      async () => {
        await colorT(xr.cells[0][3], 'fill', C.blue, .4); xr.txt[0][3].style.color = '#fff';
        await all(M.cells.flatMap((row, i) => row.map(c => colorT(c, 'fill', i === 3 ? C.lblue : '#ffffff', .4))), opacityT(M.txt.filter((_, i) => i !== 3).flat(), .25, .5), colorT(rl[3], 'color', C.blue, .4));
        await s.showDefs(D, [1]);
      },
      async () => {
        const fly = VFOX.map((v, k) => s.text(660 + k * 84 + 42, YR, fmt(v, 2), { size: 20, show: true, color: C.blue }));
        await all(fly.map((e, k) => moveText(e, 1110 + k * 84 + 42, YR, 1.1)));
        H.cells[0].forEach(c => c.setAttribute('fill', C.lblue));
      },
      async () => { await write(f, 1); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 17. Function flow ===== */
SLIDES.push({
  section: '6 · Architecture', title: 'Function flow: forward and backward', build(s) {
    s.title('6 · Architecture', 'Function flow: forward and backward');
    const Y = 410;
    const nodes = [
      { t: 'val', x: 120, l: 'x', sub: 'one-hot, V' }, { t: 'op', x: 300, l: R`\text{lookup}`, p: R`\cblue{W}` },
      { t: 'val', x: 480, l: R`\vc`, sub: 'N' }, { t: 'op', x: 670, l: R`\uw\!\cdot\vc`, p: R`\cteal{W'}` },
      { t: 'val', x: 860, l: 'z', sub: 'V scores' }, { t: 'op', x: 1050, l: R`\text{softmax}` },
      { t: 'val', x: 1230, l: R`\hat y`, sub: 'V probabilities' }, { t: 'op', x: 1400, l: R`-\log\hat y_o`, p: R`y\ (\text{true }o)` },
      { t: 'val', x: 1530, l: 'J', sub: 'loss' }];
    const els = nodes.map(n => {
      const g = n.t === 'val' ? s.circle(n.x, Y, 40, { fill: '#fff', stroke: C.ink, width: 2.5 }) : s.rect(n.x - 66, Y - 32, 132, 64, { rx: 12, fill: C.faint, stroke: C.ink, width: 2 });
      const l = s.tex(n.x, Y, n.l, { size: n.t === 'val' ? 30 : 22 });
      const sub = n.sub ? s.text(n.x, Y + 66, n.sub, { size: 16, sans: true, color: C.grey }) : null;
      let p = null, pa = null;
      if (n.p) { p = s.tex(n.x, 245, n.p, { size: 23 }); pa = s.arrow(n.x, 265, n.x, Y - 36, { color: C.grey, width: 2 }); }
      return { n, g, l, sub, p, pa, r: n.t === 'val' ? 40 : 66 };
    });
    const ed = []; for (let i = 0; i < els.length - 1; i++) { const a = els[i], b = els[i + 1]; ed.push(s.arrow(a.n.x + a.r + 4, Y, b.n.x - b.r - 4, Y, { color: C.ink, width: 2.2, head: 12 })); }
    const grads = [[860, 560, R`\frac{\partial J}{\partial z}=\hat y-y`], [480, 560, R`\frac{\partial J}{\partial \vc}=W'(\hat y-y)`], [670, 178, R`\frac{\partial J}{\partial W'}=\vc(\hat y-y)^{\top}`], [300, 178, R`\frac{\partial J}{\partial W_{c,:}}=\frac{\partial J}{\partial \vc}`]].map(([x, y, l]) => s.tex(x, y, l, { size: 21, color: C.purple }));
    const cap = s.caption('', { y: 670 });
    const D = s.defs([
      ['Forward pass', 'Evaluating each function in order, from the input to the loss.'],
      ['Backpropagation', 'Computing the loss gradients in reverse order through the same graph.'],
      ['Chain rule (calculus)', 'The derivative of a composition is the product of the derivatives of its parts.'],
      ['Gradient', 'Vector of partial derivatives. It points in the direction in which the loss grows fastest.']]);
    return [
      async () => { await s.intro(); for (let i = 0; i < els.length; i++) { const e = els[i]; await all(create(e.g, .3), fadeIn(e.l, .25), i ? create(ed[i - 1], .2) : null); } await all(els.filter(e => e.p).map(e => all(fadeIn(e.p, .4), create(e.pa, .4)))); },
      async () => {
        show(cap); await swapText(cap, 'Forward pass: each function feeds the next, ending in one number, the loss J.'); await s.showDefs(D, [0]);
        for (let i = 0; i < els.length; i++) {
          const e = els[i]; await all(fadeIn(e.sub ? [e.sub] : [], .25), colorT(e.g, 'stroke', C.blue, .2));
          if (i < els.length - 1) await pulse(s, [[e.n.x + e.r, Y], [els[i + 1].n.x - els[i + 1].r, Y]], { color: C.blue, dur: .35, r: 7 });
        }
      },
      async () => {
        await swapText(cap, 'Backward pass: the chain rule walks the same graph in reverse. The error signal is simply ŷ − y.'); await s.showDefs(D, [1, 2, 3]);
        for (let i = els.length - 1; i > 0; i--) {
          await pulse(s, [[els[i].n.x - els[i].r, Y + 2], [els[i - 1].n.x + els[i - 1].r, Y + 2]], { color: C.purple, dur: .35, r: 7 });
          await colorT(els[i - 1].g, 'stroke', C.purple, .15);
          if (i === 5) await write(grads[0], .5);
          if (i === 3) await all(write(grads[1], .5), write(grads[2], .5));
          if (i === 1) await write(grads[3], .5);
        }
      }
    ];
  }
});

/* ===== 18. Two vectors per word, parameter count ===== */
SLIDES.push({
  section: '6 · Architecture', title: 'Two vectors for every word', build(s) {
    s.title('6 · Architecture', 'Two vectors for every word, 2VN parameters');
    const M = s.matrix(230, 180, VOC.map(() => [0, 0, 0]), { cw: 60, ch: 44, fmt: () => '' });
    const rl = VOC.map((w, i) => s.text(218, 202 + i * 44, w, { size: 19, sans: true, color: C.grey, anchor: 'r' }));
    const ml = s.tex(320, 154, R`\cblue{W}`, { size: 28 });
    const M2 = s.matrix(850, 290, [0, 1, 2].map(() => VOC.map(() => 0)), { cw: 72, ch: 46, fmt: () => '' });
    const cl = VOC.map((w, j) => s.text(886 + j * 72, 270, w, { size: 16, sans: true, color: C.grey }));
    const ml2 = s.tex(1138, 232, R`\cteal{W'}`, { size: 28 });
    const v = s.tex(470, 334, R`\leftarrow\ \cblue{v_{\text{fox}}}\ \text{center vector}`, { size: 23, anchor: 'l' });
    const u = s.tex(1102, 470, R`\cteal{u_{\text{fox}}}\ \text{context vector}`, { size: 23 });
    const n1 = s.note(120, 640, `<b>Why two?</b> With one shared vector, ${T('P(\\text{fox}\\mid\\text{fox})\\propto e^{\\lVert v\\rVert^2}')} would always be large, yet a word rarely appears in its own window. Two roles also keep the gradients simple. After training, keep W.`, { w: 760, size: 21 });
    const f = s.tex(1250, 590, R`V N + N V = 2VN`, { size: 30 });
    const g = s.tex(1250, 636, R`V=10{,}000,\ \ N=300`, { size: 23, color: C.grey });
    const n = s.text(1250, 700, '0', { size: 44 });
    const D = s.defs([
      ['Center vector v_w', 'Row w of W, used when w is the center word. These rows are the embeddings we keep.'],
      ['Context vector u_w', 'Column w of W′, used when w is a candidate neighbour.'],
      ['Parameter', 'A number adjusted by training. Skip-gram has 2VN of them, linear in V.']]);
    return [
      async () => { await s.intro(); await all(M.show(.8), fadeIn([ml, ...rl], .5)); await all(M2.show(.8), fadeIn([ml2, ...cl], .5)); },
      async () => { await all(M.cells[3].map(c => colorT(c, 'fill', C.blue, .4)), colorT(rl[3], 'color', C.blue)); await write(v, .6); await s.showDefs(D, [0]); },
      async () => { await all(M2.cells.map(r => colorT(r[3], 'fill', C.teal, .4)), colorT(cl[3], 'color', C.teal)); await write(u, .6); await s.showDefs(D, [1]); },
      async () => fadeIn(n1, .6),
      async () => { await write(f, .7); await fadeIn(g, .4); show(n); await countTo(n, 0, 6e6, 1.5); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 19. Dot product ===== */
SLIDES.push({
  section: '7 · Probability model', title: 'The dot product measures alignment', build(s) {
    s.title('7 · Probability model', 'The dot product measures alignment');
    const PL = s.plane({ cx: 500, cy: 450, unit: 92, xr: [-4, 4], yr: [-3, 3] });
    const a = [2.6, 0.9], L = 2.3;
    const proj = s.line(PL.cx, PL.cy, PL.cx, PL.cy, { stroke: C.gold, width: 9, op: .8 });
    const drop = s.line(0, 0, 0, 0, { stroke: C.grey, width: 2, dash: '6 6' });
    const va = PL.vec(...a, { color: C.blue }), vb = PL.vec(L, 0, { color: C.teal });
    const la = s.tex(...PL.P(a[0] + .25, a[1] + .2), R`\cblue{a}`, { size: 28 }), lb = s.tex(0, 0, R`\cteal{b}`, { size: 28 });
    const arc = s.path('', { stroke: C.ink, width: 2 });
    const f1 = s.tex(1000, 230, R`a\cdot b=\sum_i a_i b_i=\lVert a\rVert\,\lVert b\rVert\cos\theta`, { size: 28, anchor: 'l' });
    const th = s.tex(1000, 315, '', { size: 28, anchor: 'l' }), dv = s.tex(1000, 380, '', { size: 34, anchor: 'l' }), st = s.text(1000, 445, '', { size: 26, anchor: 'l' });
    const n = s.note(1000, 560, 'The gold bar is the shadow of b on a: positive when they point the same way, zero at right angles, negative when opposed.', { w: 500, size: 21, color: C.grey });
    const setB = th0 => {
      const b = [L * Math.cos(th0), L * Math.sin(th0)]; PL.setVec(vb, ...b);
      const [bx, by] = PL.P(b[0] * 1.13, b[1] * 1.13); lb.style.left = bx + 'px'; lb.style.top = by + 'px';
      const k = dot(a, b) / dot(a, a), fp = [a[0] * k, a[1] * k];
      proj.setAttribute('x2', PL.P(...fp)[0]); proj.setAttribute('y2', PL.P(...fp)[1]);
      drop.setAttribute('x1', PL.P(...b)[0]); drop.setAttribute('y1', PL.P(...b)[1]); drop.setAttribute('x2', PL.P(...fp)[0]); drop.setAttribute('y2', PL.P(...fp)[1]);
      const aa = Math.atan2(a[1], a[0]); const d = ((th0 - aa) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      const r = 46, p0 = [PL.cx + r * Math.cos(aa), PL.cy - r * Math.sin(aa)], p1 = [PL.cx + r * Math.cos(aa + d), PL.cy - r * Math.sin(aa + d)];
      arc.setAttribute('d', `M${p0[0]},${p0[1]} A${r},${r} 0 0 ${d > 0 ? 0 : 1} ${p1[0]},${p1[1]}`);
      const v = dot(a, b), col = v > .8 ? C.green : v < -.8 ? C.red : C.grey;
      s.setTex(th, R`\theta = ${Math.abs(d * 180 / Math.PI).toFixed(0)}^\circ`); s.setTex(dv, R`a\cdot b = \textcolor{${col}}{${fmt(v, 2)}}`);
      st.innerHTML = `<span style="color:${col}">${v > .8 ? 'similar direction' : v < -.8 ? 'opposite directions' : 'roughly unrelated'}</span>`;
    };
    setB(1.15);
    const D = s.defs([
      ['Dot product a · b', 'Sum of products of matching entries. Large and positive when the vectors point the same way.'],
      ['Norm ‖a‖', 'The length of a vector, √(a · a).'],
      ['Projection', 'The shadow of b on the direction of a; its signed length is a · b / ‖a‖.']]);
    return [
      async () => { await s.intro(); await PL.show(1); await all(create(va, .6), fadeIn(la, .4)); },
      async () => { await all(create(vb, .6), fadeIn(lb, .4), create([proj, drop, arc], .6)); await write(f1, .8); await fadeIn([th, dv, st], .5); await s.showDefs(D, [0, 1]); },
      async () => tween(8, t => setB(1.15 + t * 2 * Math.PI), E.linear),
      async () => { await fadeIn(n, .6); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 20. Softmax ===== */
SLIDES.push({
  section: '7 · Probability model', title: 'Softmax: scores into probabilities', build(s) {
    s.title('7 · Probability model', 'Softmax: scores into probabilities');
    const words = ['quick', 'brown', 'jumps', 'over', 'the', 'lazy'];
    const z = [2.0, 1.0, 0.1, -0.5, 1.6, -1.2], ez = z.map(Math.exp), p = softmax(z);
    const cols = [C.blue, C.teal, C.orange, C.purple, C.green, C.pink];
    const B = s.bars({ x: 150, w: 780, base: 470, scale: 75, values: z, labels: words, colors: cols, labelGap: 125, fmt: v => fmt(v, 2) });
    const stage = s.tex(540, 182, R`\text{scores } z_w = \uw\cdot\vc\quad(\text{any real number})`, { size: 25 });
    const A = s.axes({ x: 1080, y: 200, w: 380, h: 200, xr: [-2, 2.3], yr: [0, 8], xticks: [-2, -1, 1, 2], yticks: [4, 8], xlabel: 'z', ylabel: 'e^z', tickSize: 15 });
    const ep = A.plot(Math.exp, { color: C.ink, width: 3 });
    const dts = z.map((v, i) => A.dot(v, Math.exp(v), { color: cols[i], r: 7 }));
    const sum = s.tex(1270, 480, '', { size: 26 });
    const f = s.tex(1270, 565, R`\text{softmax}(z)_w=\dfrac{e^{z_w}}{\sum_{j} e^{z_j}}`, { size: 30 });
    const zt = s.tex(1270, 660, '', { size: 26 });
    const cap = s.caption('Raising one word’s score drains probability from all the others: probabilities compete.');
    const D = s.defs([
      ['Score (logit)', 'A raw real-valued output before normalisation; here z<sub>w</sub> = u<sub>w</sub> · v<sub>c</sub>.'],
      ['Softmax', 'e<sup>z</sup> divided by the sum of all e<sup>z</sup>: turns scores into positive numbers that sum to 1.'],
      ['Probability distribution', 'Non-negative values, one per outcome, that add up to exactly 1.']]);
    const setZ = v => { const zz = z.slice(); zz[0] = v; s.setTex(zt, R`z_{\text{quick}} = ${fmt(v, 2)}`); return softmax(zz); };
    return [
      async () => { await s.intro(); await fadeIn(stage, .5); await B.show(1); await s.showDefs(D, [0]); },
      async () => { await swapTex(stage, R`\text{exponentiate: } e^{z_w} > 0`); await all(A.show(.8), create(ep, .8)); await grow(dts, .5, { lag: .3 }); await B.set(ez, 1.2, { scale: 40 }); },
      async () => {
        s.setTex(sum, R`\textstyle\sum_w e^{z_w} = ${ez.reduce((a, b) => a + b, 0).toFixed(2)}`); await fadeIn(sum, .4);
        await swapTex(stage, R`\text{normalise: divide by the sum}`); await B.set(p, 1.2, { scale: 380 });
        await swapTex(sum, R`\textstyle\sum_w P(w\mid c) = 1`); await s.showDefs(D, [2]);
      },
      async () => { await write(f, .9); await s.showDefs(D, [1]); },
      async () => { show(zt); await tween(2.2, t => { B.values = setZ(lerp(2, 3.8, t)); B.layout(); }); await fadeIn(cap, .5); },
      async () => tween(1.4, t => { B.values = setZ(lerp(3.8, 2, t)); B.layout(); })
    ];
  }
});

/* ===== 21. Skip-gram probability ===== */
SLIDES.push({
  section: '7 · Probability model', title: 'The skip-gram probability', build(s) {
    s.title('7 · Probability model', 'The skip-gram probability');
    const f = s.tex(800, 340, R`P(o\mid c)=\dfrac{\htmlClass{pn}{\exp(\htmlClass{pd}{\uo\cdot\vc})}}{\htmlClass{pq}{\sum_{w=1}^{V}\exp(\uw\cdot\vc)}}`, { size: 54 });
    const steps = s.bullets(300, 525, ['Score every vocabulary word against the center: u<sub>w</sub> · v<sub>c</sub>', 'Exponentiate to make every score positive', 'Divide by the sum over all V words'], { dy: 44, size: 23, w: 1000 });
    const ind = s.tex(800, 690, R`P(w_{t-m},\dots,w_{t+m}\mid w_t)=\prod_{-m\le j\le m,\ j\ne 0}P(w_{t+j}\mid w_t)`, { size: 27 });
    const D = s.defs([
      ['Conditional probability P(o | c)', 'Probability of context word o given that the center word c is known.'],
      ['Normaliser', 'The denominator: a sum over all V words that makes the probabilities add to 1.'],
      ['Independence assumption', 'Each neighbour is predicted separately from the same distribution; window positions are ignored.']]);
    return [
      async () => { await s.intro(); await write(f, 1.5); await s.showDefs(D, [0]); },
      async () => { const e = f.querySelector('.pd'); await indicate(e, { scale: 1.12 }); const b = s.braceUnder(e, 'dot product: how aligned the context and center vectors are', { dir: 'up', color: C.teal, size: 21, gap: 34, w: 560 }); await all(create(b[0], .5), fadeIn(b[1], .4)); },
      async () => { const b = s.braceUnder(f.querySelector('.pq'), 'normaliser: one term for each of the V words', { color: C.orange, size: 21, w: 520 }); await all(create(b[0], .5), fadeIn(b[1], .4)); await s.showDefs(D, [1]); },
      async () => fadeIn(steps, .7, { lag: .4, shift: [-10, 0] }),
      async () => { await write(ind, 1); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 22. Likelihood to loss ===== */
SLIDES.push({
  section: '8 · Objective and loss', title: 'From likelihood to a loss', build(s) {
    s.title('8 · Objective and loss', 'From likelihood to a loss');
    const lab = s.text(800, 182, 'likelihood of the corpus', { size: 19, sans: true, color: C.grey });
    const F = [
      R`L(\theta)=\prod_{t=1}^{T}\ \prod_{\substack{-m\le j\le m\\ j\ne 0}} P(w_{t+j}\mid w_t;\theta)`,
      R`\log L(\theta)=\sum_{t=1}^{T}\ \sum_{\substack{-m\le j\le m\\ j\ne 0}} \log P(w_{t+j}\mid w_t;\theta)`,
      R`J(\theta)=-\frac{1}{T}\sum_{t=1}^{T}\ \sum_{\substack{-m\le j\le m\\ j\ne 0}} \log P(w_{t+j}\mid w_t;\theta)`];
    const f = s.tex(800, 268, F[0], { size: 34 });
    const ph = s.text(150, 400, '<span class="card-h">Multiply 1,000 probabilities of 0.01</span>', { anchor: 'l' });
    const pv = s.text(150, 460, '', { size: 32, anchor: 'l' }), pk = s.text(150, 510, '', { size: 21, sans: true, color: C.grey, anchor: 'l' });
    const lh = s.text(860, 400, '<span class="card-h">Add 1,000 log-probabilities instead</span>', { anchor: 'l' });
    const lv = s.text(860, 460, '', { size: 32, anchor: 'l' });
    const n1 = s.note(150, 620, 'Products of many small numbers underflow to exactly 0. Logs turn products into sums.', { w: 620, size: 21 });
    const n2 = s.note(860, 620, 'The minus sign turns maximising into minimising, which is what optimisers expect. 1/T makes it an average.', { w: 620, size: 21 });
    const D = s.defs([
      ['Likelihood L(θ)', 'Probability of all the training data under parameters θ: a product over every pair.'],
      ['Log-likelihood', 'Its logarithm. Turns the product into a sum and has the same maximiser.'],
      ['Loss function J(θ)', 'What training minimises; here the negative average log-likelihood.'],
      ['Underflow', 'A result too small for floating point, so it rounds to exactly 0.']]);
    return [
      async () => { await s.intro(); await fadeIn(lab, .4); await write(f, 1.2); await s.showDefs(D, [0]); },
      async () => {
        await fadeIn([ph, lh], .5); show(pv, pk, lv);
        await tween(3, t => {
          const k = Math.max(1, Math.round(t * 1000)), v = Math.pow(0.01, k);
          pv.innerHTML = v === 0 ? '<span class="hl-r">0 &nbsp;(underflow)</span>' : v.toExponential(2).replace('e-', ' × 10<sup>−') + '</sup>';
          pk.textContent = `${k} factors`; lv.innerHTML = `<span class="hl-g">${fmt(k * Math.log(0.01), 1)}</span>`;
        }, E.linear);
        await fadeIn(n1, .5); await s.showDefs(D, [3]);
      },
      async () => { lab.textContent = 'log-likelihood'; await swapTex(f, F[1], .6); await s.showDefs(D, [1]); },
      async () => { lab.textContent = 'negative average log-likelihood: the loss to minimise'; await swapTex(f, F[2], .6); await fadeIn(n2, .5); await s.showDefs(D, [2]); }
    ];
  }
});

/* ===== 23. -log p and cross-entropy ===== */
SLIDES.push({
  section: '8 · Objective and loss', title: 'The price of being wrong', build(s) {
    s.title('8 · Objective and loss', 'The price of being wrong: −log p');
    const A = s.axes({ x: 180, y: 200, w: 700, h: 450, xr: [0, 1], yr: [0, 5], xticks: [.25, .5, .75, 1], yticks: [1, 2, 3, 4, 5], xlabel: R`P(o\mid c)`, ylabel: R`-\log P`, grid: true });
    const zone = s.rect(A.X(0), A.y, A.X(.1) - A.X(0), A.h, { fill: C.lred, fillOp: .45 });
    const zl = s.text(A.X(.05) + 6, A.y + 40, 'confidently<br>wrong', { size: 17, sans: true, color: C.red, anchor: 'l', w: 110 });
    const cv = A.plot(p => -Math.log(p), { domain: [.006, 1], color: C.orange, width: 4.5 });
    const d = A.dot(.9, -Math.log(.9), { color: C.orange, r: 11 });
    const vl = s.line(0, 0, 0, 0, { stroke: C.grey, width: 2, dash: '5 5' });
    const rp = s.tex(1020, 260, '', { size: 32, anchor: 'l' }), rl = s.tex(1020, 330, '', { size: 32, anchor: 'l' });
    const n = s.note(1020, 440, 'Near zero when the true word gets high probability; grows without bound as that probability goes to 0.', { w: 480, size: 21 });
    const ce = s.tex(1260, 600, R`H(y,\hat y)=-\sum_w y_w\log\hat y_w=-\log\hat y_o`, { size: 27 });
    const setP = p => {
      const y = -Math.log(p); d.setAttribute('cx', A.X(p)); d.setAttribute('cy', A.Y(Math.min(5.3, y)));
      vl.setAttribute('x1', A.X(p)); vl.setAttribute('x2', A.X(p)); vl.setAttribute('y1', A.Y(0)); vl.setAttribute('y2', A.Y(Math.min(5.3, y)));
      s.setTex(rp, R`P(o\mid c)=${p.toFixed(2)}`); s.setTex(rl, R`\text{loss}=\corange{${y.toFixed(2)}}`);
    };
    setP(.9);
    const D = s.defs([
      ['Negative log-likelihood', 'Loss for one pair, −log P(o | c): 0 when the true word gets probability 1, unbounded as it nears 0.'],
      ['Cross-entropy H(y, ŷ)', '−Σ y log ŷ between the true one-hot y and the prediction ŷ. With one-hot y it equals −log ŷ<sub>o</sub>.'],
      ['Confidently wrong', 'Giving tiny probability to what actually happened. Punished the hardest.']]);
    return [
      async () => { await s.intro(); await A.show(1); await create(cv, 1.2); await s.showDefs(D, [0]); },
      async () => { await all(grow(d, .4), create(vl, .3), fadeIn([rp, rl], .4)); await tween(3, t => setP(lerp(.9, .02, t))); },
      async () => { await all(create(zone, .5), fadeIn(zl, .4)); await fadeIn(n, .5); await tween(1.8, t => setP(lerp(.02, .6, t))); await s.showDefs(D, [2]); },
      async () => { await write(ce, 1); await s.showDefs(D, [1]); }
    ];
  }
});

/* ===== 24. Gradient descent ===== */
SLIDES.push({
  section: '9 · Optimisation', title: 'Gradient descent and the learning rate', build(s) {
    s.title('9 · Optimisation', 'Gradient descent and the learning rate');
    const f = s.tex(800, 182, R`\theta_{\text{new}}=\theta_{\text{old}}-\alpha\,\nabla J(\theta_{\text{old}})`, { size: 32 });
    const cfg = [[.05, 'too small: crawls', C.blue], [.3, 'about right', C.green], [1.04, 'too large: overshoots, diverges', C.red]];
    const P = cfg.map(([a, lab, col], k) => {
      const A = s.axes({ x: 90 + k * 490, y: 270, w: 400, h: 310, xr: [-2.6, 2.6], yr: [0, 6.5], xticks: [-2, 2], yticks: [], tickSize: 15 });
      return { A, a, col, cv: A.plot(x => x * x, { color: C.ink, width: 3 }), h: s.tex(290 + k * 490, 236, R`\alpha = ${a}`, { size: 25, color: col }), hl: s.text(290 + k * 490, 640, lab, { size: 20, sans: true, color: col }) };
    });
    const D = s.defs([
      ['Gradient descent', 'Repeatedly step the parameters against the gradient: θ ← θ − α∇J.'],
      ['Learning rate α', 'The step size. Too small crawls; too large overshoots.'],
      ['Convergence / divergence', 'Settling at a minimum, versus bouncing further away with every step.']]);
    return [
      async () => { await s.intro(); await write(f, 1); await all(P.map(p => all(p.A.show(.8), create(p.cv, .8), fadeIn(p.h, .5)))); await s.showDefs(D, [0, 1]); },
      async () => {
        await all(P.map(async p => {
          let x = -2, yv = 4; const A = p.A, ball = A.dot(x, yv, { color: p.col, r: 10 }); await grow(ball, .3);
          for (let k = 0; k < 10; k++) {
            const nx = x - p.a * 2 * x, ny = nx * nx;
            if (Math.abs(nx) > 2.55) break;
            const ar = s.arrow(A.X(x), A.Y(yv), A.X(nx), A.Y(ny), { color: p.col, width: 2, head: 9, op: .7 });
            await all(create(ar, .3), attrT(ball, { cx: A.X(nx), cy: A.Y(ny) }, .4)); x = nx; yv = ny;
          }
          await fadeIn(p.hl, .3);
        }));
        await s.showDefs(D, [2]);
      }
    ];
  }
});
