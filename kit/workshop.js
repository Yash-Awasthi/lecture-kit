'use strict';
/* Workshop page: an editable dataset, a parameter panel and Python cells that run in the browser
   through Pyodide. Configured by a global WORKSHOP object (see the deck's workshop.js).
   Cells draw charts through the `deck` Python module (kit/deck.py), which calls window.ws.viz. */

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const Workshop = {
  built: false, py: null, loading: null, queue: Promise.resolve(), cm: {}, stop: false, done: new Set(),
  get cfg() { return Object.assign({ title: 'Workshop', subtitle: '', packages: ['numpy'], params: [], choices: [], cells: [] }, typeof WORKSHOP !== 'undefined' ? WORKSHOP : {}); },

  enter() {
    if (!this.built) this.build();
    if (!this.py && !this.loading) this.load();
    if (new URLSearchParams(location.search).has('autorun') && !this.autoran) { this.autoran = true; this.loading.then(() => this.runAll()); }
  },

  build() {
    this.built = true;
    const W = this.cfg, el = $('workshop'), wsI = SLIDES.findIndex(x => x.workshop);
    const D = W.data, esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = `
      <header class="ws-top">
        <button class="ws-btn ghost" id="ws-back" title="Previous slide">&#8249; slides</button>
        <div class="ws-title">${W.title} <span>${W.subtitle || ''}</span></div>
        <div class="ws-actions">
          <span class="ws-status" id="ws-status"><i></i><b>loading Python</b></span>
          <button class="ws-btn" id="ws-runall">run all</button>
          <button class="ws-btn danger" id="ws-stop">stop</button>
          ${wsI < SLIDES.length - 1 ? `<button class="ws-btn ghost" id="ws-next" title="Next slide">${esc(SLIDES[wsI + 1].title || 'next')} &#8250;</button>` : ''}
        </div>
      </header>
      <div class="ws-body">
        <aside class="ws-side">
          ${W.params.length || W.choices.length ? `<div class="ws-card"><div class="ws-h">Parameters</div>
            ${W.params.map(p => `<label class="ws-param"><span>${p.label}<em id="pv-${p.k}">${p.v}</em></span><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.v}" data-k="${p.k}"></label>`).join('')}
            ${W.choices.map(c => `<label class="ws-param"><span>${c.label}</span><select data-k="${c.k}">${c.options.map(([l, v]) => `<option value="${esc(JSON.stringify(v))}" ${v === c.v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}
            ${W.hint ? `<p class="ws-hint">${W.hint}</p>` : ''}<p class="ws-hint">Changes apply to cells run after the change; press <b>run all</b> to redo everything.</p></div>` : ''}
          <div class="ws-card"><div class="ws-h">Steps</div><ol class="ws-toc">${W.cells.map(c => `<li><a href="#ws-${c.id}" data-id="${c.id}">${c.title}</a></li>`).join('')}</ol></div>
        </aside>
        <main class="ws-main">
          ${D ? `<section class="ws-cell" id="ws-data">
            <div class="ws-cell-h"><span class="ws-num">0</span><h3>${D.title || 'Data'}</h3><span class="ws-meta" id="ws-dstats"></span></div>
            ${D.text ? `<p>${D.text}</p>` : ''}
            <textarea id="ws-text" spellcheck="false"></textarea>
            <div class="ws-row">
              ${D.regenerate ? `<button class="ws-btn ghost" id="ws-gen">${D.regenerateLabel || 'regenerate'}</button>` : ''}
              <label class="ws-btn ghost">load file<input type="file" accept="${D.accept || '.txt,.csv,text/plain'}" id="ws-file" hidden></label>
              <button class="ws-btn ghost" id="ws-reset-data">reset</button>
              <button class="ws-btn ghost" id="ws-clear">clear</button>
            </div>
          </section>` : ''}
          ${W.cells.map((c, i) => `
          <section class="ws-cell" id="ws-${c.id}">
            <div class="ws-cell-h"><span class="ws-num">${i + 1}</span><h3>${c.title}</h3>${c.slide ? `<span class="ws-meta">slides: ${c.slide}</span>` : ''}</div>
            ${c.text ? `<p>${c.text}</p>` : ''}
            <div class="ws-code" data-id="${c.id}"></div>
            <div class="ws-row"><button class="ws-btn" data-run="${c.id}">run <kbd>Shift + Enter</kbd></button><button class="ws-btn ghost" data-reset="${c.id}">reset code</button><span class="ws-time" id="t-${c.id}"></span></div>
            <pre class="ws-out" id="o-${c.id}"></pre>
            <div class="ws-viz" id="v-${c.id}"></div>
          </section>`).join('')}
        </main>
      </div>`;

    el.addEventListener('keydown', e => { if (isTyping(e.target)) e.stopPropagation(); });
    $('ws-back').onclick = () => goto(wsI - 1, Infinity, { instant: true });
    if ($('ws-next')) $('ws-next').onclick = () => goto(wsI + 1);
    $('ws-runall').onclick = () => this.runAll();
    $('ws-stop').onclick = () => { this.stop = true; };
    el.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { $('pv-' + r.dataset.k).textContent = r.value; }));
    el.querySelectorAll('.ws-toc a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); $('ws-' + a.dataset.id).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    if (D) {
      const ta = $('ws-text'), initial = typeof D.initial === 'function' ? D.initial() : (D.initial || '');
      ta.value = initial; this.dstats(); ta.addEventListener('input', () => this.dstats());
      if ($('ws-gen')) $('ws-gen').onclick = () => { ta.value = D.regenerate(); this.dstats(); };
      $('ws-reset-data').onclick = () => { ta.value = initial; this.dstats(); };
      $('ws-clear').onclick = () => { ta.value = ''; this.dstats(); };
      $('ws-file').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => { ta.value = t; this.dstats(); }); };
    }
    W.cells.forEach(c => {
      const host = el.querySelector(`.ws-code[data-id="${c.id}"]`);
      this.cm[c.id] = CodeMirror(host, { value: c.code.replace(/^\n/, ''), mode: 'python', lineNumbers: true, indentUnit: 4, viewportMargin: Infinity, extraKeys: { 'Shift-Enter': () => this.run(c.id), Tab: cmi => cmi.replaceSelection('    ') } });
    });
    el.querySelectorAll('[data-run]').forEach(b => b.onclick = () => this.run(b.dataset.run));
    el.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => { const c = W.cells.find(x => x.id === b.dataset.reset); this.cm[c.id].setValue(c.code.replace(/^\n/, '')); });
    window.ws = this.bridge();
  },

  dstats() {
    const t = $('ws-text').value, lines = t.split('\n').filter(l => l.trim()).length, toks = (t.match(/\S+/g) || []).length;
    $('ws-dstats').textContent = `${commas(lines)} lines · ${commas(toks)} tokens · ${commas(t.length)} characters`;
  },

  status(txt, state) { const s = $('ws-status'); s.className = 'ws-status ' + (state || ''); s.querySelector('b').textContent = txt; },

  load() {
    this.status('loading Python runtime', 'busy');
    const boot = window.PYO_EMBEDDED ? this.bootEmbedded() : new Promise((res, rej) => {
      const sc = document.createElement('script'); sc.src = PYODIDE_URL + 'pyodide.js';
      sc.onload = res; sc.onerror = () => rej(new Error('could not load Python (offline? use the offline build)')); document.head.appendChild(sc);
    }).then(() => loadPyodide({ indexURL: PYODIDE_URL }));
    this.loading = boot.then(async py => {
      const pk = this.cfg.packages;
      this.status('loading ' + pk.join(', '), 'busy');
      py.runPython(`import os; os.environ['MPLBACKEND'] = 'Agg'`);
      if (pk.length) await py.loadPackage(pk);
      py.FS.writeFile('/home/pyodide/deck.py', document.getElementById('deck-py').textContent);
      this.py = py;
      py.setStdout({ batched: s => this.write(s + '\n') });
      py.setStderr({ batched: s => this.write(s + '\n', 'err') });
      this.status('Python ready', 'ok');
    }).catch(e => { console.error(e); this.status(e.message, 'bad'); this.loading = null; });
    return this.loading;
  },

  // Offline build: runtime files and package wheels sit in inert <script type="text/plain" data-pyo> blocks.
  // Pyodide fetches them from a made-up base URL, and a fetch wrapper answers from those blocks.
  bootEmbedded() {
    const BASE = 'https://pyodide.embedded/', files = {};
    document.querySelectorAll('script[data-pyo]').forEach(el => { files[el.dataset.pyo] = el; });
    this.realFetch = window.fetch.bind(window);
    const bytes = async el => {
      const blob = await (await this.realFetch('data:application/octet-stream;base64,' + el.textContent.trim())).blob();
      return el.dataset.gz === '1' ? new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : blob.arrayBuffer();
    };
    const mime = { wasm: 'application/wasm', json: 'application/json' };
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url || !url.startsWith(BASE)) return this.realFetch(input, init);
      const name = decodeURIComponent(url.slice(BASE.length).split('?')[0]), el = files[name];
      if (!el) return new Response('not embedded: ' + name, { status: 404 });
      return new Response(await bytes(el), { headers: { 'Content-Type': mime[name.split('.').pop()] || 'application/octet-stream' } });
    };
    for (const f of ['pyodide.asm.js', 'pyodide.js']) { const s = document.createElement('script'); s.textContent = files[f].textContent; document.head.appendChild(s); }
    return loadPyodide({ indexURL: BASE });
  },

  write(s, cls) {
    const o = this.curOut; if (!o) return;
    if (cls) { const sp = document.createElement('span'); sp.className = cls; sp.textContent = s; o.appendChild(sp); } else o.appendChild(document.createTextNode(s));
    o.scrollTop = o.scrollHeight;
  },

  inject() {
    const py = this.py, W = this.cfg, el = $('workshop');
    if (W.data) py.globals.set(W.data.name || 'DATA', $('ws-text').value);
    el.querySelectorAll('input[type=range]').forEach(r => {
      const p = W.params.find(x => x.k === r.dataset.k), v = parseFloat(r.value);
      py.globals.set(r.dataset.k, v);
      if (p && (p.float || !Number.isInteger(p.step))) py.runPython(`${r.dataset.k} = float(${r.dataset.k})`);
    });
    el.querySelectorAll('select[data-k]').forEach(s => py.globals.set(s.dataset.k, py.toPy(JSON.parse(s.value))));
  },

  // Cells share one namespace, so a cell is only valid after every cell above it ran since.
  // Running cell k first replays any earlier cell that never ran or was invalidated.
  run(id, all = false) {
    this.queue = this.queue.then(async () => {
      if (!this.py) { if (!this.loading) this.load(); await this.loading; if (!this.py) return; }
      const C = this.cfg.cells, k = C.findIndex(c => c.id === id);
      for (const c of C.slice(0, k)) if ((all || !this.done.has(c.id)) && !(await this.exec(c.id))) return;
      await this.exec(id);
    });
    return this.queue;
  },
  async exec(id) {
    const o = $('o-' + id), t0 = performance.now(), C = this.cfg.cells;
    o.textContent = ''; o.classList.add('on'); this.curOut = o; this.stop = false;
    const sec = $('ws-' + id); sec.classList.add('running');
    $('t-' + id).textContent = 'running…';
    C.slice(C.findIndex(c => c.id === id)).forEach(c => this.done.delete(c.id));
    let ok = true;
    try { this.inject(); await this.py.runPythonAsync(this.cm[id].getValue()); sec.classList.remove('err'); this.done.add(id); }
    catch (e) { ok = false; this.write(String(e.message || e).split('\n').slice(-12).join('\n'), 'err'); sec.classList.add('err'); }
    sec.classList.remove('running');
    $('t-' + id).textContent = `${((performance.now() - t0) / 1000).toFixed(2)} s`;
    if (!o.textContent.trim()) o.classList.remove('on');
    return ok && !this.stop;
  },
  runAll() { const C = this.cfg.cells; return C.length ? this.run(C[C.length - 1].id, true) : Promise.resolve(); },

  /* ---------- charts drawn on request from Python ---------- */
  bridge() {
    const self = this;
    return { get stop() { return self.stop; }, viz(cell, kind, key, js) { self.viz(cell, kind, key, JSON.parse(js)); } };
  },
  panel(cell, key, title) {
    const host = $('v-' + cell); if (!host) throw new Error('no cell ' + cell);
    let p = host.querySelector(`.ws-panel[data-key="${CSS.escape(key)}"]`);
    if (!p) { p = document.createElement('div'); p.className = 'ws-panel'; p.dataset.key = key; p.innerHTML = '<div class="ws-vh"></div><div class="ws-pb"></div>'; host.appendChild(p); }
    if (title != null) p.firstChild.textContent = title;
    return p;
  },
  colorOf(label, group, groups) {
    const W = this.cfg;
    if (W.colorOf) { const c = W.colorOf(label, group); if (c) return c; }
    if (group != null) return PALETTE[groups.indexOf(group) % PALETTE.length];
    return C.blue;
  },
  viz(cell, kind, key, d) {
    const p = this.panel(cell, key, d.title), b = p.lastChild;
    const f = this['draw_' + kind]; if (!f) throw new Error('unknown chart ' + kind);
    f.call(this, p, b, d);
  },
  draw_bars(p, b, d) {
    const n = d.labels.length, S = d.series.length, W = Math.max(620, Math.min(1100, n * 46 + 80)), H = 250, pad = 50, bw = (W - pad - 10) / n;
    const vals = d.series.flatMap(s => s.values), max = Math.max(0, ...vals), min = Math.min(0, ...vals), span = (max - min) || 1;
    const Y = v => 10 + (max - v) / span * (H - 20);
    let svg = `<svg viewBox="0 0 ${W} ${H + 70}" class="ws-svg">`;
    [min, (min + max) / 2, max].forEach(v => { svg += `<line x1="${pad}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eef0f3"/><text x="${pad - 6}" y="${Y(v) + 4}" text-anchor="end">${+v.toPrecision(3)}</text>`; });
    d.labels.forEach((l, i) => {
      d.series.forEach((s, k) => { const v = s.values[i], y0 = Y(Math.max(0, v)), h = Math.abs(Y(v) - Y(0)), x = pad + i * bw + 4 + k * (bw - 8) / S; svg += `<rect x="${x}" y="${y0}" width="${Math.max(1, (bw - 8) / S - 2)}" height="${h}" rx="2" fill="${PALETTE[k % PALETTE.length]}"><title>${l}: ${v}</title></rect>`; });
      svg += `<text x="${pad + i * bw + bw / 2}" y="${H + 16}" text-anchor="end" transform="rotate(-35 ${pad + i * bw + bw / 2} ${H + 16})">${l}</text>`;
    });
    b.innerHTML = (S > 1 ? `<div class="ws-legend">${d.series.map((s, k) => `<span><i style="background:${PALETTE[k % PALETTE.length]}"></i>${s.name}</span>`).join('')}</div>` : '') + svg + '</svg>';
  },
  draw_table(p, b, d) {
    b.innerHTML = `<table class="ws-table"><thead><tr>${d.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="q"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  },
  // Line chart; d.series = {name: [[x, y], ...]}. d.push appends one point, d.reset clears.
  draw_line(p, b, d) {
    p._s = d.reset ? {} : (p._s || {});
    if (d.push) (p._s[d.push.name] ||= []).push([d.push.x, d.push.y]);
    if (d.series) Object.assign(p._s, d.series);
    if (d.xlabel) p._xl = d.xlabel; if (d.ylabel) p._yl = d.ylabel;
    const S = p._s, names = Object.keys(S), pts = names.flatMap(n => S[n]);
    const W = 560, H = 300, l = 52, bt = 36, t = 14, r = 14;
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const x0 = Math.min(0, ...xs), x1 = Math.max(x0 + 1, ...xs), y0 = Math.min(0, ...ys), y1 = Math.max(y0 + 1e-9, ...ys) * 1.08;
    const X = x => l + (x - x0) / (x1 - x0) * (W - l - r), Y = y => H - bt - (y - y0) / ((y1 - y0) || 1) * (H - bt - t);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="ws-svg"><line x1="${l}" y1="${H - bt}" x2="${W - r}" y2="${H - bt}" stroke="#5b616b"/><line x1="${l}" y1="${t}" x2="${l}" y2="${H - bt}" stroke="#5b616b"/>`;
    [y0, (y0 + y1) / 2, y1].forEach(v => s += `<text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${+v.toPrecision(3)}</text>`);
    [x0, x1].forEach(v => s += `<text x="${X(v)}" y="${H - bt + 16}" text-anchor="middle">${+v.toPrecision(3)}</text>`);
    if (p._xl) s += `<text x="${(W + l) / 2}" y="${H - 4}" text-anchor="middle">${p._xl}</text>`;
    if (p._yl) s += `<text x="12" y="${H / 2}" text-anchor="middle" transform="rotate(-90 12 ${H / 2})">${p._yl}</text>`;
    names.forEach((n, k) => {
      const c = PALETTE[k % PALETTE.length], P = S[n]; if (!P.length) return;
      s += `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${P.map(q => `${X(q[0])},${Y(q[1])}`).join(' ')}"/>`;
      const q = P[P.length - 1]; s += `<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="4" fill="${c}"/><text x="${X(q[0]) - 6}" y="${Y(q[1]) - 9}" text-anchor="end" class="hi" fill="${c}">${+q[1].toPrecision(4)}</text>`;
    });
    b.innerHTML = (names.length > 1 ? `<div class="ws-legend">${names.map((n, k) => `<span><i style="background:${PALETTE[k % PALETTE.length]}"></i>${n}</span>`).join('')}</div>` : '') + s + '</svg>';
  },
  // 2-D scatter with labels; repeated calls with the same number of points animate between positions.
  draw_scatter(p, b, d) {
    const W = 680, H = 480, m = 34, n = d.xy.length, groups = [...new Set(d.groups || [])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const mx = Math.max(...d.xy.map(q => Math.abs(q[0]))) || 1, my = Math.max(...d.xy.map(q => Math.abs(q[1]))) || 1;
    if (!p._svg || p._n !== n) {
      b.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ws-svg ws-scatter"><line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="#eef0f3"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#eef0f3"/></svg>`;
      p._svg = b.firstChild; p._n = n;
      p._els = d.xy.map((_, i) => {
        const lab = d.labels?.[i], col = this.colorOf(lab, d.groups?.[i], groups), g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'pt'); g.innerHTML = `<circle r="${lab != null && n <= 150 ? 4.5 : 3}" fill="${col}"/>` + (lab != null && n <= 150 ? `<text x="7" y="4" fill="${col}">${lab}</text>` : '');
        p._svg.appendChild(g); return g;
      });

    }
    const lg = b.querySelector('.ws-legend'); if (lg) lg.remove();
    if (groups.length && groups.length <= 12) b.insertAdjacentHTML('afterbegin', `<div class="ws-legend">${groups.map(g => `<span><i style="background:${this.colorOf(null, g, groups)}"></i>${g}</span>`).join('')}</div>`);
    d.xy.forEach((q, i) => {
      const e = p._els[i]; e.setAttribute('transform', `translate(${W / 2 + q[0] / mx * (W / 2 - m)},${H / 2 - q[1] / my * (H / 2 - m)})`);
      if (d.groups) { const col = this.colorOf(d.labels?.[i], d.groups[i], groups); for (const c of e.children) c.setAttribute('fill', col); }
    });
  },
  async draw_scatter3d(p, b, d) {
    if (p._s3) p._s3.disposers.forEach(f => f());
    b.innerHTML = '<div class="ws-3d"></div>'; const host = b.firstChild, groups = [...new Set(d.groups || [])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    p._s3 = { alive: true, disposers: [], root: host };
    const mx = Math.max(...d.xyz.flat().map(Math.abs)) || 1, k = 2.2 / mx;
    const ctx = await Scene.prototype.three.call(p._s3, 0, 0, host.clientWidth, 520, { parent: host, cam: [4.6, 3.2, 5.2], autoRotate: true, rotSpeed: .5 });
    if (!ctx) return; ctx.box.style.opacity = 1; ctx.grid(5, 10, -2.4);
    const labelled = d.labels && d.xyz.length <= 200;
    if (d.xyz.length > 400) ctx.cloud(d.xyz.map(q => q.map(v => v * k)), { colors: d.xyz.map((_, i) => this.colorOf(d.labels?.[i], d.groups?.[i], groups)), size: .06 });
    else d.xyz.forEach((q, i) => {
      const P = q.map(v => v * k), col = this.colorOf(d.labels?.[i], d.groups?.[i], groups);
      ctx.sphere(P, .05, col); if (labelled) ctx.label(d.labels[i], [P[0], P[1] + .13, P[2]], { color: col, size: 14 });
    });
  },
  draw_heatmap(p, b, d) {
    const M = d.M, R = M.length, Cn = M[0].length, flat = M.flat(), max = Math.max(...flat.map(Math.abs)) || 1, min = Math.min(...flat);
    const cw = Math.max(14, Math.min(48, 760 / Cn)), ch = Math.max(14, Math.min(40, 520 / R)), lw = d.rows ? 90 : 10, th = d.cols ? 70 : 10;
    const lvl = v => d.diverging ? Math.abs(v) / max : clamp((v - Math.min(0, min)) / ((max - Math.min(0, min)) || 1));
    const col = v => d.diverging ? diverge(v / max) : mix('#ffffff', C.blue, lvl(v));
    let s = `<svg viewBox="0 0 ${lw + Cn * cw + 10} ${th + R * ch + 10}" class="ws-svg" style="max-width:${lw + Cn * cw + 10}px">`;
    M.forEach((r, i) => r.forEach((v, j) => { s += `<rect x="${lw + j * cw}" y="${th + i * ch}" width="${cw - 1}" height="${ch - 1}" fill="${col(v)}"><title>${d.rows?.[i] ?? i}, ${d.cols?.[j] ?? j}: ${+v.toPrecision(4)}</title></rect>`; if (d.values && cw >= 34 && ch >= 18) s += `<text x="${lw + j * cw + cw / 2}" y="${th + i * ch + ch / 2 + 4}" text-anchor="middle" style="fill:${lvl(v) > .55 ? '#ffffff' : '#2b2f36'};font-weight:600">${+v.toPrecision(2)}</text>`; }));
    (d.rows || []).forEach((l, i) => s += `<text x="${lw - 6}" y="${th + i * ch + ch / 2 + 4}" text-anchor="end">${l}</text>`);
    (d.cols || []).forEach((l, j) => s += `<text x="${lw + j * cw + cw / 2}" y="${th - 6}" transform="rotate(-50 ${lw + j * cw + cw / 2} ${th - 6})">${l}</text>`);
    b.innerHTML = s + '</svg>';
  },
  draw_image(p, b, d) { b.innerHTML = `<img class="ws-img" src="data:image/png;base64,${d.png}">`; }
};
