# Workshop

`<deck-dir>/workshop.js` defines one global:

```js
const WORKSHOP = {
  title: 'Workshop', subtitle: 'k-means from scratch, in real Python',
  packages: ['numpy', 'scikit-learn'],          // must match deck.json python.packages for the offline build
  data: {                                       // optional editable text panel, injected as a Python string
    name: 'CORPUS', title: 'Corpus', text: 'help text',
    initial: () => makeCorpus(7), regenerate: () => makeCorpus(Date.now()), regenerateLabel: 'new corpus', accept: '.txt,.csv'
  },
  params: [{ k: 'K', label: 'clusters k', min: 2, max: 8, step: 1, v: 4 }],   // sliders, injected as int (or float if step is fractional or float: true)
  choices: [{ k: 'METRIC', label: 'distance', options: [['euclidean', 'l2'], ['cosine', 'cos']], v: 'l2' }],
  hint: 'side-panel hint',
  colorOf: (label, group) => '#hex' | undefined,   // optional colour per point label in charts
  cells: [{ id: 'c1', title: 'Make data', slide: 'slides 3 to 5', text: 'what this cell shows', code: `python` }]
};
```

Rules:
- Cells share one namespace and run in order. Running cell k first automatically replays every earlier cell that has not run or that was invalidated; running a cell invalidates all cells below it. So each cell may rely on everything above it, never on anything below.
- Every cell must run from a fresh interpreter with the default parameters, deterministically (seeded `np.random.default_rng(SEED)`).
- Long loops: check `deck.stopped()` and `await deck.tick()` once per epoch so charts repaint and the stop button works. Top-level `await` is allowed.
- Keep a cell under about 40 lines and under about 10 seconds with default parameters.
- Pyodide 0.26.4 packages include numpy, scipy, scikit-learn, pandas, matplotlib, networkx, sympy, statsmodels, xgboost, lightgbm, opencv-python, nltk, shapely, pillow. No PyTorch or TensorFlow: write neural networks in numpy (that is the point of a from-scratch workshop).
- The offline file embeds the packages listed in deck.json and their dependencies: numpy alone is about 14 MB, with scikit-learn and matplotlib about 52 MB.

## Charts from Python: `import deck`

Every function takes the cell id first; calling again with the same `key` updates that chart in place. numpy arrays are fine anywhere.

| Call | Draws |
|---|---|
| `deck.bars(cell, labels, {name: values} or values, title=, key=)` | grouped bars |
| `deck.table(cell, head, rows, title=)` | table |
| `deck.line(cell, {name: [(x, y), ...] or [y, ...]}, title=, xlabel=, ylabel=)` | line chart |
| `deck.line_reset(cell, title=, xlabel=)` then `deck.line_push(cell, name, x, y)` | live training curve |
| `deck.scatter(cell, xy, labels=, groups=, title=, key=)` | 2-D scatter; same-size updates animate and recolour |
| `deck.scatter3d(cell, xyz, labels=, groups=)` | rotatable 3-D scatter (point cloud above 400 points) |
| `deck.heatmap(cell, M, rows=, cols=, diverging=, values=, title=)` | matrix |
| `deck.image(cell, fig=None, title=)` | a matplotlib figure |
| `deck.stopped()`, `await deck.tick()` | stop button, repaint |

Print statements go to the cell's output box; errors show the last lines of the traceback in red.
