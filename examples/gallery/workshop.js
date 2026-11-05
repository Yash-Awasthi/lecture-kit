'use strict';
/* Workshop: k-means from scratch in numpy, then a scikit-learn classifier and a matplotlib plot. */

const WORKSHOP = {
  title: 'Workshop', subtitle: 'clustering and classification, in real Python',
  packages: ['numpy', 'scikit-learn', 'matplotlib'],
  params: [
    { k: 'K', label: 'clusters k', min: 2, max: 8, step: 1, v: 4 },
    { k: 'N', label: 'points per blob', min: 20, max: 300, step: 10, v: 120 },
    { k: 'SPREAD', label: 'blob spread', min: .2, max: 2, step: .1, v: .7 },
    { k: 'SEED', label: 'random seed', min: 0, max: 99, step: 1, v: 3 }
  ],
  cells: [
    {
      id: 'c1', title: 'Make some data', slide: '',
      text: 'Four Gaussian blobs in 2-D. The true blob of each point is kept only to check the result later.',
      code: `
import numpy as np
import deck

rng = np.random.default_rng(SEED)
centres = rng.uniform(-5, 5, size=(4, 2))
X = np.concatenate([c + SPREAD * rng.standard_normal((N, 2)) for c in centres])
y_true = np.repeat(np.arange(4), N)
print(X.shape, "points")
deck.scatter("c1", X, groups=[f"blob {g}" for g in y_true], title="the data, coloured by true blob")`
    },
    {
      id: 'c2', title: 'k-means from scratch', slide: '',
      text: 'Alternate two steps: assign every point to its nearest centre, then move each centre to the mean of its points. Watch the colours settle.',
      code: `
C = X[rng.choice(len(X), K, replace=False)]
deck.line_reset("c2", title="within-cluster sum of squares", xlabel="iteration")
for it in range(15):
    d = ((X[:, None, :] - C[None]) ** 2).sum(-1)      # (n, K) squared distances
    assign = d.argmin(1)
    inertia = d[np.arange(len(X)), assign].sum()
    deck.scatter("c2", X, groups=[f"cluster {a}" for a in assign], title=f"iteration {it + 1}", key="map")
    deck.line_push("c2", "inertia", it + 1, inertia)
    newC = np.array([X[assign == k].mean(0) if (assign == k).any() else C[k] for k in range(K)])
    if np.allclose(newC, C):
        print("converged after", it + 1, "iterations")
        break
    C = newC
    await deck.tick()`
    },
    {
      id: 'c3', title: 'A classifier with scikit-learn', slide: '',
      text: 'Logistic regression on the true labels, with a train/test split. The confusion matrix shows which blobs get mixed up.',
      code: `
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, accuracy_score

Xtr, Xte, ytr, yte = train_test_split(X, y_true, test_size=0.3, random_state=SEED)
clf = LogisticRegression(max_iter=500).fit(Xtr, ytr)
acc = accuracy_score(yte, clf.predict(Xte))
print(f"test accuracy {acc:.3f}")
cm = confusion_matrix(yte, clf.predict(Xte))
deck.heatmap("c3", cm, rows=[f"true {i}" for i in range(4)], cols=[f"pred {i}" for i in range(4)], values=True, title="confusion matrix")`
    },
    {
      id: 'c4', title: 'Decision regions with matplotlib', slide: '',
      text: 'Any matplotlib figure can be shown with deck.image.',
      code: `
import matplotlib.pyplot as plt

xx, yy = np.meshgrid(np.linspace(X[:, 0].min() - 1, X[:, 0].max() + 1, 300), np.linspace(X[:, 1].min() - 1, X[:, 1].max() + 1, 300))
Z = clf.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
fig, ax = plt.subplots(figsize=(6, 4.5))
ax.contourf(xx, yy, Z, alpha=0.25, cmap="tab10", levels=np.arange(5) - 0.5)
ax.scatter(X[:, 0], X[:, 1], c=y_true, cmap="tab10", s=10, vmin=0, vmax=9)
ax.set_title("logistic regression decision regions")
deck.image("c4", fig)`
    },
    {
      id: 'c5', title: 'The same idea in 3-D', slide: '',
      text: 'Three blobs in 3-D; drag the view.',
      code: `
X3 = np.concatenate([c + SPREAD * rng.standard_normal((N, 3)) for c in rng.uniform(-4, 4, size=(3, 3))])
deck.scatter3d("c5", X3, groups=np.repeat(["a", "b", "c"], N))`
    }
  ]
};
