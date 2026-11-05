# lecture-kit

Animated single-file HTML lecture decks: stepped animations in the style of 3Blue1Brown, real 3D with three.js, neuron, flow, graph, tree, array, code and heatmap diagrams, KaTeX maths, a live Python workshop that runs in the browser (Pyodide with numpy, scikit-learn, matplotlib and more), presenter tools and a presenter window with speaker notes. Every deck builds into one HTML file that also works fully offline.

## Quick start

```sh
npm install
node tools/vendor.mjs numpy                 # once: libraries and the Python runtime for offline builds
node tools/new.mjs decks/my-talk --title "My Talk"
node build.mjs decks/my-talk                # writes decks/my-talk/dist/
node tools/check.mjs decks/my-talk          # plays every step, runs every cell, screenshots to check/
```

Then double-click `decks/my-talk/dist/start.bat` (or run `start.sh`). The `dist/` folder is self-contained: copy it to any laptop with Node.js or Python and present.

## Presenting

| Key | Action |
|---|---|
| Right, Space, PageDown | next step |
| Left, PageUp | step back |
| Ctrl+Right / Ctrl+Left | next / previous slide |
| Shift+Right | animation speed 1×, 2×, 4× |
| Shift+Left | play the last step backwards |
| P | presenter window: notes for the current slide and step, next slide, timer |
| L | laser pointer |
| D, H, E, C | pen, highlighter, eraser, clear (1 to 6 pick the pen colour) |
| W | whiteboard |
| B or . | blackout |
| Z | zoom: click a point to zoom in, click again to zoom out |
| O | outline |
| F | fullscreen |
| T | hide or show the control bar |
| ? | all keys |
| number, Enter | jump to a slide |

Every key can be remapped per deck in `deck.json` → `keys`. Presentation clickers work out of the box (PageDown, PageUp, B, .).

## A deck folder

```
deck.json        name, title, Python packages, key overrides, control bar options
slides/*.js      the slides, loaded in file-name order
workshop.js      optional: the workshop page (data, parameters, Python cells)
notes.md         the speaking script shown in the presenter window
assets/          images referenced as 'assets/<file>' (inlined at build time)
```

See `examples/gallery` for every building block and `examples/skipgram` for a full talk with workshop and notes. The authoring guide and API reference are in `skill/lecture-deck/`.

## Python packages

List them in `deck.json` → `python.packages`, then run `node tools/vendor.mjs --deck <deck-dir>`. Only those packages and their dependencies are embedded in the offline file (numpy alone about 14 MB; with scikit-learn and matplotlib about 52 MB). Pyodide has no PyTorch or TensorFlow.

## Skill

- `node tools/install-skill.mjs` installs the authoring skill into `~/.claude/skills/lecture-deck`, pointing at this checkout.
- `node tools/pack-skill.mjs` writes `dist/lecture-deck.zip` (skill plus kit, about 300 KB) for uploading where skills are managed as zip files.
