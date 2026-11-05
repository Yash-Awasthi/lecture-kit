# Design rules

## Stage and layout grid

Every slide is drawn on a fixed 1600 × 900 stage, scaled to fit the screen. All coordinates are stage pixels.

| Zone | y range | What goes there |
|---|---|---|
| Section label | 64 | `s.title(section, title)` draws both |
| Title | 112 | one line, at most about 60 characters at the default 46 px |
| Content | 160 to 740 | diagrams, formulas, notes |
| Caption | 750 | `s.caption(text)`, one sentence |
| Definitions strip | 782 to 900 | `s.defs([...])`, 2 to 4 terms |

- Leave 80 px margins left and right (content between x = 80 and x = 1520).
- A common split: diagram on the left (x 100 to 900), formula and notes on the right (x 980 to 1500).
- Text is anchored at its centre by default; use `anchor: 'l'` for left-aligned columns and `w:` to wrap.
- The control bar sits at the top right (y < 45) and auto-hides; keep important content below y = 50 there.

## Type

- Titles, formulas and body text use the KaTeX serif (Computer Modern look). Labels, axes and UI-like text use `sans: true` (Inter). Code uses `mono: true` or `s.code`.
- Sizes: title 46; main formula 30 to 54; body notes 21 to 24; diagram labels 18 to 22; definitions 18. Nothing below 15.

## Colour meaning (keep it consistent across the deck)

| Colour | Constant | Typical meaning |
|---|---|---|
| blue | `C.blue` | the main object, inputs, center/query, "current" |
| teal | `C.teal` | context, neighbours, secondary vectors |
| orange | `C.orange` | the thing being changed or highlighted now, outputs, loss |
| green | `C.green` | correct, true, positive, converged |
| red | `C.red` | wrong, negative, error, danger zone |
| purple | `C.purple` | gradients, backward pass, theory |
| grey | `C.grey` | secondary labels, axes |

Light variants (`C.lblue`, `C.lteal`, `C.lred`, `C.lorange`, `C.lgreen`, `C.lpurple`) are for fills. `PALETTE` is the ordered categorical palette for groups and series. In formulas use `\cblue{...}`, `\cteal{...}`, `\corange{...}`, `\cgreen{...}`, `\cred{...}`, `\cpurple{...}`, `\cgrey{...}`, `\cpink{...}`, `\cgold{...}` so a symbol has the same colour in the formula and in the diagram.

## Animation style

- Step 1 of almost every slide: `await s.intro()` (title), then the first object.
- One idea per step. A step is usually 1 to 3 seconds; long loops (training, traversal) can run longer but should speed up after the first few iterations (see the dynamic-window slide in the skipgram example).
- `write` for formulas and text, `create` for lines, paths and shapes, `grow` for dots and nodes, `fadeIn` for groups and notes, `indicate` to point at something already on screen, `tint` / `colorT` to change meaning, `tween` for anything continuous.
- Show cause and effect: when a number changes, move the thing that changed it at the same time (`all(...)`).
- 3D only where depth adds understanding (embedding spaces, loss surfaces, tensors, networks). Always add "drag to rotate" hint text the first time.

## Content patterns that work

- Concept slide: example first, formula second, definition strip last.
- Algorithm slide: data structure (array, graph, tree) on the left, code on the right with `code.hl(line)` following the animation.
- Model slide: `s.network` or `s.flow` showing the forward pass with `pulse`, then the backward pass in purple.
- Comparison slide: `s.table` revealed row by row.
- Every section ends with a slide that connects it to the next.
- The last slides: limitations and real-world uses, summary table, workshop, thank you with real sources and a QR code to the slides.
