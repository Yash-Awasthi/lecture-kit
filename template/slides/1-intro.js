'use strict';
/* Slides run in file-name order. Each slide returns a list of steps; each step is one press of Right. */

SLIDES.push(titleSlide({
  title: 'Deck title', subtitle: 'One line on what the audience will learn',
  institute: 'Institute name', people: [['Presenter One', 'id'], ['Presenter Two', 'id']]
}));

SLIDES.push({
  section: '1 · First idea', title: 'A first content slide', build(s) {
    s.title('1 · First idea', 'A first content slide');
    const f = s.tex(800, 260, R`y = \sigma(w^{\top}x + b)`, { size: 44 });
    const A = s.axes({ x: 300, y: 360, w: 600, h: 300, xr: [-6, 6], yr: [0, 1.05], xticks: [-4, 4], yticks: [.5, 1], xlabel: 'z', grid: true });
    const curve = A.plot(sigmoid, { color: C.blue });
    const n = s.note(1000, 500, 'The sigmoid squashes any score into a probability between 0 and 1.', { w: 460 });
    const D = s.defs([
      ['Sigmoid', '1 / (1 + e<sup>−z</sup>): maps any real number into (0, 1).'],
      ['Weight w, bias b', 'Learned numbers that turn the input x into a score z.']]);
    return [
      async () => { await s.intro(); await write(f, 1); await s.showDefs(D, [1]); },
      async () => { await A.show(.8); await create(curve, 1); await fadeIn(n, .5); await s.showDefs(D, [0]); }
    ];
  }
});
