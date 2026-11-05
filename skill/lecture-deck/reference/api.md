# API reference

All functions are globals in the built page. Source: `KIT/kit/engine.js`, `shapes.js`, `blocks.js`, `player.js`.

## A slide

```js
SLIDES.push({
  section: '3 · Training', title: 'Gradient descent',   // section and title also feed the outline and presenter window
  notes: 'optional markdown, used when notes.md has no "## Slide N" for this slide',
  build(s) {                                              // s is a Scene; create everything hidden, return the steps
    s.title('3 · Training', 'Gradient descent');
    const f = s.tex(800, 200, R`\theta \leftarrow \theta - \alpha\nabla J`, { size: 34 });
    const D = s.defs([['Learning rate α', 'Step size.']]);
    return [
      async () => { await s.intro(); await write(f, 1); await s.showDefs(D, [0]); },   // step 1
      async () => { /* step 2 */ }
    ];
  }
});
```

Elements are created hidden (opacity 0) except where `show: true` is passed; steps reveal them. Steps must be idempotent from a fresh build: the player rebuilds the slide and fast-forwards earlier steps when going back. Do not keep state outside `build`.

Ready-made slides (`blocks.js`):
- `titleSlide({ title, subtitle, institute, logo: 'assets/logo.png', people: [[name, id]], peopleTag, extra: [[tag, text]], art: false | async s => {}, artGroups })`. The default art is 3D points settling into clusters; `artGroups: [{ color, c: [x,y,z], words: [...] }]` labels them.
- `sectionSlide(num, name, { subtitle })`
- `workshopSlide(title)` (the workshop page; needs `workshop.js`)
- `thanksSlide({ heading, sub, institute, logo, qr: url, qrLabel, sources: [html] })`
- `clusterArt(s, x, y, w, h, { groups, seed })` returns a 3D ctx with `ctx.toClusters(dur)`.

Image paths written as the string `'assets/<file>'` are inlined into the HTML at build time.

## Scene `s`: 2D primitives

Coordinates are stage pixels (1600 × 900). Common options: `show: true` (start visible), `op` (opacity when shown), `parent` (a group from `s.g()`).

| Call | Returns | Notes |
|---|---|---|
| `s.title(section, title)` / `s.intro()` | | intro animates the title in |
| `s.text(x, y, html, o)` | div | `size, color, sans, mono, italic, weight, anchor ('c','l','r','t','b','tl','tr','bl','br'), w (wrap width), align, cls, tex` |
| `s.tex(x, y, latex, o)` | div | KaTeX; same options; `s.setTex(el, latex)` to change |
| `s.note(x, y, html, { w, size })` | div | left-anchored wrapped paragraph |
| `s.caption(html, { y })` | div | centred one-liner at y 750 |
| `s.bullets(x, y, items, { dy, size, w, bullet })` | div[] | |
| `s.defs([[term, text], ...])`, `s.showDefs(D, [i...])` | | bottom strip |
| `s.line / circle / rect / path / poly` | SVG el | `stroke, width, fill, fillOp, dash, rx, closed` |
| `s.arrow(x1, y1, x2, y2, { color, width, head, dash })` | g | `a.set(x1,y1,x2,y2)`, `a.setColor(c)`; animate with `arrowTo(a, ...)` |
| `s.brace(x1, x2, y, o)`, `s.braceUnder(el, label, { color, dir: 'up', w })` | | brace under any element |
| `s.pill(x, y, label, { size, minW, tex, sans })` | `{ box, t, cx, cy, left, right, top, bot, els }` | rounded label; recolour with `tint(p, col, dur, { solid })` |
| `s.wordRow(words, { y, size, gap, left, cx })` | pill[] | a sentence of pills |
| `s.matrix(x, y, rows, { cw, ch, fmt, heat, heatMax })` | `{ cells[i][j], txt[i][j], show() }` | |
| `s.table(x, y, colWidths, rows, { rh, size, sans })` | rows with `.reveal(i)` | row 0 is the header |
| `s.axes({ x, y, w, h, xr, yr, xticks, yticks, xlabel, ylabel, grid, xfmt, yfmt })` | `A` | `A.show()`, `A.X(v)`, `A.Y(v)`, `A.plot(fn, { color, width, dash, domain })`, `A.dot(x, y, o)`, `A.fn(fn)` path string |
| `s.bars({ x, w, base, scale, values, labels, colors, color, fmt })` | `B` | `B.show()`, `B.set(values, dur)`, `B.values = ...; B.layout()`, `B.cx(i)`, `B.recolor(cols)` |
| `s.plane({ cx, cy, unit, xr, yr })` | `PL` | 2D grid; `PL.vec(x, y, o)`, `PL.setVec(a, x, y)`, `PL.vecTo(a, x, y, dur)`, `PL.P(x, y)` |
| `s.network(layers, { cy })` | `N` | `layers: [{ x, n, gap, r }]`; `N.L[layer][i] = { x, y, c }`, `N.E[k][i][j]` edges, `N.show()` |
| `s.graph(nodes, edges, o)` | `G` | see below |
| `s.tree(root, { cx, y, dx, dy, directed })` | `G` + `G.order.{pre,in,post,bfs}` | `root = { label, id?, children: [...] }` |
| `s.flow(steps, { vertical, from, to, at })` | `G` + `G.flowTo(i, col)` | `steps: ['data', { label, sub, edge }]` |
| `s.heatmap(x, y, M, { cw, ch, rowLabels, colLabels, scale: 'seq' or 'div', max, min, color, values, digits, rotate })` | `H` | `H.show()`, `H.set(M, dur)`, `H.outline(i, j, col)` |
| `s.array(x, y, values, { cw, ch, size, indices, base })` | `A` | `A.show()`, `A.mark(i, col)`, `A.set(i, v)`, `A.swap(i, j)`, `A.pointer(name, i, col, { below })` with `.to(k)` |
| `s.code(x, y, source, { w, size, lh, numbers })` | `CD` | `CD.show()`, `CD.hl(line)`, `CD.hlOff()`, `CD.dim([keepLines])` |
| `s.img(x, y, w, h, src)` | img | |
| `s.g()` | group | for `create(group)` |
| `s.loop((dt, now) => {})` | | per-frame callback until the slide closes; return false to stop |
| `s.rectOf(el)` | `{ x, y, w, h }` | stage box of any element |

### Graphs

```js
const G = s.graph(
  [{ id: 'A', x: 200, y: 400 }, { id: 'B', x: 450, y: 260, shape: 'box', label: 'encoder', sub: 'optional caption' }],
  [['A', 'B', { directed: true, label: 'w=3', bend: 40 }]],
  { r: 26, size: 22, directed: false, tex: false });
await G.show(1.2);
await G.color('A', C.blue, .3, { solid: true });   // fill; without solid a light tint
await G.edgeColor('A', 'B', C.orange, .3, 3.4);
await G.travel(['A', 'B'], { color: C.orange, mark: true });   // a dot moves along the path
G.node.A.el / G.node.A.t / G.find('A', 'B').el
```

## Animations (all return promises; combine with `all(...)`)

`fadeIn(els, dur, { lag, shift: [dx, dy] })`, `fadeOut(els, dur, { remove })`, `write(els, dur)`, `create(els, dur, { lag })`, `grow(els, dur, { lag })`, `indicate(els, { scale, color, dur })`, `opacityT(els, to, dur)`, `colorT(el, 'fill' | 'stroke' | 'color', hex, dur)`, `attrT(el, { x: 10, width: 200 }, dur)`, `moveText(el, x, y, dur)`, `shift(els, dx, dy, dur)`, `tint(pill, col, dur, { solid })`, `countTo(el, a, b, dur, fmt)`, `swapText(el, html)`, `swapTex(el, latex)`, `pulse(s, [[x, y], ...], { color, dur, r })`, `tween(dur, t => {}, E.smooth)`, `wait(sec)`, `all(...promises)`, `show(...)`, `hide(...)`.

Easing: `E.smooth`, `E.linear`, `E.out`, `E.in`, `E.back`, `E.wave`.

Helpers: `R` (String.raw for LaTeX), `T(latex)` (KaTeX HTML string for inline maths inside `s.note`), `texMacros({ name: latex })`, `fmt(v, digits)`, `commas(n)`, `clamp`, `lerp`, `sigmoid`, `softmax`, `dot`, `norm`, `rng(seed)` (deterministic random in [0, 1)), `gauss(r)`, `mix(c1, c2, t)`, `diverge(v)`, `C`, `PALETTE`.

## 3D: `const ctx = await s.three(x, y, w, h, { cam: [x, y, z], target, fov, autoRotate, rotSpeed })`

Returns null if the slide closed meanwhile (always `if (!ctx) return;`). Reveal with `await fadeIn(ctx.box, .7)`. `ctx.box` is the DOM container, never overwrite it.

| Call | Notes |
|---|---|
| `ctx.sphere(pos, r, color, { opacity })` | mesh; move with `m.position.set(...)` |
| `ctx.arrow(from, to, color, { r })` | `a.setTo(from, to)` |
| `ctx.line(a, b, color, { dashed, opacity })` | `l.setTo(a, b)` |
| `ctx.label(text, pos, { color, size, tex })` | HTML label that follows the 3D point |
| `ctx.axes(len, { labels: ['x', 'y', 'z'] })`, `ctx.grid(size, div, y)` | |
| `ctx.cloud(points, { color, colors, size })` | thousands of points; `setPositions(P)` |
| `ctx.surface(fn, { xr, zr, n, scaleY, low, high, wire, opacity })` | height field; `mesh.at(x, z)` height, `mesh.update(fn)` |
| `ctx.block(center, [w, h, d], color, { opacity })` | box with edges, e.g. tensors |
| `ctx.path3(points, color)` | polyline; `setPoints(P)` for growing trajectories |
| `ctx.network3d([{ n, color, label }], { at, gap, spacing, r })` | layers of neuron spheres with all edges |
| `ctx.onFrame(now => {})` | per-frame callback |
| `ctx.TH`, `ctx.scene`, `ctx.cam`, `ctx.controls` | raw three.js access |

## Player and deck.json

```json
{
  "name": "file-name-stem",
  "title": "Shown in the browser tab and presenter window",
  "python": { "packages": ["numpy", "scikit-learn", "matplotlib"] },
  "keys": { "next": ["ArrowRight", "Space", "PageDown"], "laser": ["l", "k"] },
  "controls": { "buttons": ["player", "tools", "outline", "nav"], "autoHide": true, "hidden": false },
  "css": "optional extra stylesheet in the deck folder",
  "lang": "en"
}
```

Default keys (override any action in `keys`): next Right/Space/PageDown/Down, prev Left/PageUp/Up, nextSlide Ctrl+Right, prevSlide Ctrl+Left, reverse Shift+Left, speed Shift+Right, replay R, first Home, last End, outline O, help ?, presenter P, laser L, pen D, highlighter H, eraser E, clear C, whiteboard W, blackout B or ., zoom Z, fullscreen F, chrome (show or hide controls) T. Digits then Enter jump to a slide; digits 1 to 6 pick the pen colour while drawing. Esc leaves any tool. URL `#12` opens slide 12, `#workshop` the workshop, `?autorun` runs all cells on arrival, `?debug` shows errors on screen.
