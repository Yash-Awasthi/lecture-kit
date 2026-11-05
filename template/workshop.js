'use strict';
/* Workshop cells run in one shared Python namespace. Parameters and data are injected as globals. */
const WORKSHOP = {
  title: 'Workshop', subtitle: 'the idea, in real Python',
  packages: ['numpy'],
  params: [
    { k: 'N', label: 'number of points', min: 10, max: 500, step: 10, v: 100 },
    { k: 'SEED', label: 'random seed', min: 0, max: 99, step: 1, v: 0 }
  ],
  cells: [
    {
      id: 'c1', title: 'Make data', slide: 'slide 2',
      text: 'Random scores and their sigmoid.',
      code: `
import numpy as np
import deck

rng = np.random.default_rng(SEED)
z = np.sort(rng.normal(0, 3, N))
p = 1 / (1 + np.exp(-z))
print(f"{N} points, mean probability {p.mean():.3f}")
deck.line("c1", {"sigmoid": list(zip(z, p))}, title="sigmoid of random scores", xlabel="z")`
    }
  ]
};
