# notes.md: the speaking script

The presenter window (key P) reads `notes.md` from the deck folder (embedded at build time). It shows the section for the current slide and highlights the points of the current step.

## Format

```markdown
# <Title>: speaking script

## Speaker split
| Part | Slides | Speaker |
|---|---|---|
| ... | 1 to 18 | A |
| ... | 19 to 37 | B |
Handover lines, one sentence each.

## Notation
| Symbol | Meaning | In the code |
|---|---|---|
| V | vocabulary size | `V` |

---

## Slide 1. Title (A)

**Keywords:** term, term, term.

1. [1] What to say at step 1.
2. [2] What to say at step 2. Exact numbers that are on screen.
3. Point without a marker: belongs to the step above it.

If asked: one-line answer to the most likely follow-up question.

## Slide 2. ...

## Questions to expect
- Question? Answer.
```

Rules:
- Headings `## Slide N` must match the slide numbers in the built deck (1-based, the workshop page counts as a slide). Other `##` sections (speaker split, notation, questions) appear under "all notes" in the presenter window.
- `[n]` at the start of a list item marks the step it belongs to; items after it inherit the step until the next marker.
- Points are what is spoken, not what is on screen: short, numbered, in order. Keep every number, symbol and term exact.
- Each slide: keywords line, numbered points, then "If asked" lines for the likely nitpicks (derivations, edge cases, where a number comes from, what the slide simplified).
- For a team, split by contiguous sections with one or two handovers; never alternate every slide.
- End with a questions section covering definitions, why each design choice, complexity, limitations, and how the method relates to its successors.
