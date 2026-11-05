---
name: lecture-deck
description: Build an animated, single-file HTML lecture or seminar deck from study material (CS, AI, ML, maths, systems), in the style of 3Blue1Brown, with stepped animations, real 3D (three.js), neuron and flow diagrams, graphs, code tracing, KaTeX maths, a live in-browser Python workshop (Pyodide with numpy, scikit-learn, matplotlib and more), presenter tools (laser, pen, whiteboard, zoom, presenter notes window) and a speaking-script notes.md. Use when asked for slides, a presentation, a lecture, a seminar deck, a teaching or study deck, a workshop page, or speaker notes for a technical topic; also when asked to fix or extend a deck built with this kit. Not for .pptx.
---

# Lecture deck

Turns study material into a deck that teaches: every idea is built up on screen step by step, every formula is motivated by a picture, and the talk ends in a hands-on Python workshop that runs offline in the browser.

## Where the kit is

The kit (engine, build, checker, template, examples) is the folder `lecture-kit/` next to this file. If that folder does not exist, read the absolute path in `kit-path.txt` next to this file. Below, `KIT` means that folder.

First time on a machine: `cd KIT && npm install`, then `node tools/vendor.mjs numpy` (downloads the libraries and the Python runtime once, for offline builds). Skip vendoring when there is no network; the online build still works.

## Workflow

1. **Read the material and plan.** Write an outline in sections. One idea per slide, 2 to 6 steps per slide, 25 to 45 slides for a 40-minute talk. Decide early which ideas get a 3D scene, a neuron diagram, a flow, a graph, a code trace or a plot. Plan the workshop cells alongside the slides: each cell should implement what one or two slides explained.
2. **Scaffold.** `node KIT/tools/new.mjs <deck-dir> --title "Title"` (add `--no-workshop` if there is none). Read `KIT/examples/gallery/slides/1-blocks.js` for a working pattern of every building block and `KIT/examples/skipgram/` for a full 39-slide talk with workshop and notes.
3. **Write slides** in `<deck-dir>/slides/*.js` (file-name order). Follow `reference/design.md` for layout and style and `reference/api.md` for every function. Put shared shorthands in the first slide file (`texMacros`, constants, data generators).
4. **Write the workshop** in `<deck-dir>/workshop.js` (see `reference/workshop.md`). Set the Python packages in `deck.json` → `python.packages`. Cells must run top to bottom from a fresh interpreter, with fixed seeds.
5. **Write `notes.md`**, the speaking script, in the format of `reference/notes.md`. The presenter window (key P) shows the current slide's notes and highlights the current step.
6. **Build and check, then look.**
   - `node KIT/build.mjs <deck-dir>` writes `dist/<name>.html` (CDN) and `dist/<name>-offline.html` (everything embedded), plus launchers.
   - `node KIT/tools/check.mjs <deck-dir>` plays every step of every slide in headless Chrome, fails on script errors, warns on text that overlaps or leaves the stage, exercises the presenter tools, runs every workshop cell (last cell first, then run all), and saves `check/NN.png` per slide.
   - Open the screenshots and look at every slide. Fix overlaps, crowding, empty halves, unreadable labels, 3D cameras that hide the point of the scene. Rebuild and re-check until there are no failures and no warnings you cannot justify.
   - Use `--slides 5-9` to re-check a range quickly, `--fast` to skip animation.
7. **Deliver.** Hand over `dist/` (HTML, `notes.md`, `start.bat` / `start.sh`, `start-workshop.bat`, `serve.mjs`). Tell the user: double-click `start.bat`, press `?` for keys, `P` for the presenter window.

## Without a local machine (for example in a hosted sandbox)

Network or Chrome may be missing. Then:
- Build with `node KIT/build.mjs <deck-dir> --online-only` (the deck loads libraries from CDNs when opened).
- If Chrome is missing, skip `check.mjs`, but at least run `node --check` on every slide file and re-read each slide's coordinates against the layout grid in `reference/design.md`.
- Give the user the deck folder and say: on your machine run `npm install`, `node tools/vendor.mjs --deck <deck-dir>`, `node build.mjs <deck-dir>`, `node tools/check.mjs <deck-dir>` for the offline file and the full check.

## Rules that matter

- Plain white background, no themes, no decoration. Colour carries meaning and stays consistent across the deck (see `reference/design.md`).
- Build up, do not dump: a slide starts nearly empty and each step adds or transforms one thing. Prefer transforming an object (move, recolour, morph) over replacing it.
- Every formula appears with the picture or example that explains it, and every symbol is defined on screen (definitions strip) or in the notation table of `notes.md`.
- Numbers on slides must be computed, not invented: compute them in the slide code (as the skipgram deck does with softmax values) or verify them in Python and state them in the notes.
- Keep the definitions strip to 2 to 4 terms per slide; reveal each term in the step that introduces it.
- Never invent citations. Sources on the closing slide must be real and checkable.
- After any edit: rebuild, re-check, look at the screenshots.
