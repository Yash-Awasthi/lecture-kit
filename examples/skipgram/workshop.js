'use strict';
/* Workshop: skip-gram from scratch in numpy, on an editable toy corpus. */

const TOY_GROUPS = {
  royalty: { color: C.purple, words: ['king', 'queen', 'prince', 'princess', 'crown', 'throne', 'castle', 'kingdom', 'royal'] },
  people: { color: C.pink, words: ['man', 'woman', 'boy', 'girl', 'he', 'she', 'his', 'her'] },
  animals: { color: C.orange, words: ['cat', 'dog', 'puppy', 'kitten', 'horse'] },
  food: { color: C.green, words: ['apple', 'mango', 'banana', 'bread', 'rice'] },
  vehicles: { color: C.blue, words: ['car', 'bus', 'truck', 'train', 'bike'] },
  places: { color: C.teal, words: ['paris', 'rome', 'berlin', 'madrid', 'tokyo', 'france', 'italy', 'germany', 'spain', 'japan', 'french', 'italian', 'german', 'spanish', 'japanese'] }
};
const WORD_COLOR = {};
for (const g of Object.values(TOY_GROUPS)) g.words.forEach(w => WORD_COLOR[w] = g.color);

function toyCorpus2(seed = 7, n = 900) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
  const M = ['king', 'prince', 'man', 'boy'], F = ['queen', 'princess', 'woman', 'girl'];
  const animals = TOY_GROUPS.animals.words, food = TOY_GROUPS.food.words, veh = TOY_GROUPS.vehicles.words;
  const caps = [['paris', 'france', 'french'], ['rome', 'italy', 'italian'], ['berlin', 'germany', 'german'], ['madrid', 'spain', 'spanish'], ['tokyo', 'japan', 'japanese']];
  const T = [
    () => { const i = Math.floor(r() * 4), f = r() < .5; const w = f ? F[i] : M[i]; return pick([`the ${w} said ${f ? 'she' : 'he'} was tired`, `${f ? 'she' : 'he'} is a ${w}`, `the ${w} and ${f ? 'her' : 'his'} friend went home`, `the ${w} smiled at ${f ? 'her' : 'his'} family`]); },
    () => { const w = pick(['king', 'queen', 'prince', 'princess']); return pick([`the ${w} rules the kingdom from the castle`, `the ${w} wears a golden crown`, `the royal ${w} sat on the throne`, `the ${w} lives in the castle`]); },
    () => { const w = pick(['man', 'woman', 'boy', 'girl']); return pick([`the ${w} works in the village`, `the ${w} walks to the market`, `a young ${w} plays in the street`, `the ${w} buys bread at the market`]); },
    () => { const w = pick(animals); return pick([`the ${w} sleeps on the warm mat`, `my ${w} eats food every day`, `the ${w} runs in the garden`, `we feed the ${w} at night`, `the little ${w} is a cute pet`]); },
    () => { const w = pick(food); return pick([`i eat a fresh ${w} for lunch`, `the ${w} is sweet and tasty`, `we cook ${w} for dinner`, `she bought a ripe ${w} today`]); },
    () => { const w = pick(veh); return pick([`we drive the ${w} on the road`, `the ${w} needs fuel`, `the ${w} stops at the station`, `he parked the ${w} near the road`]); },
    () => { const [c, k, l] = pick(caps); return pick([`${c} is the capital of ${k}`, `people in ${k} speak ${l}`, `we flew to ${c} in ${k}`, `${c} is a big city in ${k}`]); }
  ];
  return Array.from({ length: n }, () => pick(T)()).join('\n');
}

const WS_CELLS = [
  {
    id: 'c1', title: 'Tokenise the corpus and build the vocabulary', slide: 'sections 2 and 4',
    text: 'Every line of the corpus is a sentence. We lowercase, split into words, count them and keep words that occur at least <code>MIN_COUNT</code> times. The vocabulary size V fixes the shape of both weight matrices.',
    code: `import re
import numpy as np
from collections import Counter
import deck

# CORPUS and the hyperparameters are injected from the panel on the left.
sentences = [re.findall(r"[a-z']+", line.lower()) for line in CORPUS.splitlines()]
sentences = [s for s in sentences if len(s) > 1]
counts = Counter(w for s in sentences for w in s)
vocab = sorted((w for w, c in counts.items() if c >= MIN_COUNT), key=lambda w: -counts[w])
w2i = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
n_tokens = sum(counts[w] for w in vocab)

print(f"{len(sentences)} sentences, {n_tokens} tokens, V = {V}")
print("most common:", counts.most_common(8))
deck.bars("c1", vocab[:18], {"count": [counts[w] for w in vocab[:18]]})`
  },
  {
    id: 'c2', title: 'Subsampling and the noise distribution', slide: 'sections 10 and 11',
    text: 'Frequent words are dropped at random with probability 1 − √(t / f). Negatives are drawn from the unigram distribution raised to 3/4. Compare the two bar series: the giants shrink, the rare words grow.',
    code: `freq = np.array([counts[w] for w in vocab], dtype=float) / n_tokens

# Paper formula for discarding frequent words; SUBSAMPLE_T = 0 switches it off.
p_discard = np.clip(1 - np.sqrt(SUBSAMPLE_T / freq), 0, 1) if SUBSAMPLE_T > 0 else np.zeros(V)

# Negatives come from count^(3/4), renormalised.
noise = freq ** 0.75
noise /= noise.sum()

for w in vocab[:6] + vocab[-3:]:
    i = w2i[w]
    print(f"{w:>10}  freq {freq[i]:.4f}   discard {p_discard[i]:.2f}   noise {noise[i]:.4f}")

top = vocab[:14]
deck.bars("c2", top, {"unigram f(w)": [freq[w2i[w]] for w in top],
                      "noise f(w)^0.75": [noise[w2i[w]] for w in top]})`
  },
  {
    id: 'c3', title: 'Slide the window: (center, context) pairs', slide: 'section 4',
    text: 'For every position, sample an effective window b between 1 and <code>WINDOW</code> (the dynamic window) and emit one pair per neighbour. The last lines check the pair-count formula s(2n − s − 1) on the first sentence.',
    code: `rng = np.random.default_rng(SEED)

def make_pairs(window=WINDOW, subsample=True, dynamic=True):
    """All (center, context) index pairs for one pass over the corpus."""
    pairs = []
    for s in sentences:
        ids = [w2i[w] for w in s if w in w2i]
        if subsample:
            ids = [i for i in ids if rng.random() >= p_discard[i]]
        for t, c in enumerate(ids):
            b = rng.integers(1, window + 1) if dynamic else window
            for j in range(max(0, t - b), min(len(ids), t + b + 1)):
                if j != t:
                    pairs.append((c, ids[j]))
    return np.array(pairs, dtype=np.int64).reshape(-1, 2)

pairs = make_pairs()
print(len(pairs), "pairs in one epoch (subsampled, dynamic window)")
for c, o in pairs[:10]:
    print(f"  ({vocab[c]}, {vocab[o]})")

s0 = [w2i[w] for w in sentences[0] if w in w2i]
n, s = len(s0), min(WINDOW, len(s0) - 1)
fixed = sum(1 for t in range(n) for j in range(max(0, t - s), min(n, t + s + 1)) if j != t)
print(f"first sentence: n = {n}, s = {s}: counted {fixed}, formula s(2n-s-1) = {s * (2 * n - s - 1)}")`
  },
  {
    id: 'c4', title: 'The model, and one full-softmax step', slide: 'sections 6 to 9',
    text: 'W holds the center vectors (rows), W′ the context vectors (columns). The forward pass is a row lookup, a dot product with every column and a softmax. The update uses exactly the gradients from the slides: the error P − y.',
    code: `rng = np.random.default_rng(SEED)
W  = (rng.random((V, DIM)) - 0.5) / DIM    # center vectors v_w, one row per word
Wp = np.zeros((DIM, V))                    # context vectors u_w, one column per word
print(f"parameters: 2VN = 2 x {V} x {DIM} = {2 * V * DIM:,}")

def softmax(z):
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()

def full_softmax_step(c, o, lr=0.0):
    global W, Wp
    v = W[c].copy()                # one-hot times W is just a row lookup
    p = softmax(v @ Wp)            # P(w | c) for every word w
    loss = -np.log(p[o])
    if lr:
        err = p.copy(); err[o] -= 1          # prediction error P - y
        W[c] -= lr * (Wp @ err)              # dJ/dv_c = -u_o + sum_w P(w|c) u_w
        Wp -= lr * np.outer(v, err)          # dJ/du_w = (P(w|c) - y_w) v_c
    return p, loss

c, o = pairs[0]
p, loss = full_softmax_step(c, o)
print(f"pair ({vocab[c]}, {vocab[o]}): P(o|c) = {p[o]:.4f}  (1/V = {1 / V:.4f}), loss = {loss:.3f}")
for _ in range(25):
    p, loss = full_softmax_step(c, o, lr=0.5)
print(f"after 25 steps on this pair:  P(o|c) = {p[o]:.4f}, loss = {loss:.3f}")
top = np.argsort(-p)[:12]
deck.bars("c4", [vocab[i] for i in top], {f"P(w | {vocab[c]})": p[top]})`
  },
  {
    id: 'c5', title: 'Train with negative sampling', slide: 'section 10',
    text: 'Mini-batch SGD on the negative-sampling loss, with the learning rate decaying linearly as in word2vec.c. After every epoch the loss and a 2-D projection of W are sent to the charts, so you can watch clusters form. Press <b>stop</b> to interrupt.',
    code: `def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def project(E, k=2):
    """PCA with a fixed sign convention, so the picture does not flip between epochs."""
    X = E - E.mean(0)
    _, _, Vt = np.linalg.svd(X, full_matrices=False)
    Vt = Vt[:k] * np.sign(Vt[:k, [0]] + 1e-12)
    return X @ Vt.T

async def train(epochs=EPOCHS, batch=BATCH):
    global W, Wp
    rng = np.random.default_rng(SEED)
    W  = (rng.random((V, DIM)) - 0.5) / DIM
    Wp = np.zeros((DIM, V))
    history = []
    deck.line_reset("c5", title="loss per pair", xlabel="epoch")
    for epoch in range(epochs):
        P = make_pairs()
        rng.shuffle(P)
        lr = LR * max(1e-4, 1 - epoch / epochs)
        total = 0.0
        for b in range(0, len(P), batch):
            cs, true = P[b:b + batch, 0], P[b:b + batch, 1]
            negs = rng.choice(V, size=(len(cs), NEG), p=noise)
            ctx = np.concatenate([true[:, None], negs], axis=1)     # (B, k+1), true word first
            v = W[cs]                                               # (B, N)
            U = Wp[:, ctx].transpose(1, 2, 0)                       # (B, k+1, N)
            s = sigmoid(np.einsum('bn,bkn->bk', v, U))
            y = np.zeros_like(s); y[:, 0] = 1
            g = s - y                                               # prediction error
            total -= np.log(s[:, 0] + 1e-9).sum() + np.log(1 - s[:, 1:] + 1e-9).sum()
            np.add.at(W, cs, -lr * np.einsum('bk,bkn->bn', g, U))
            np.add.at(Wp.T, ctx.ravel(), -lr * np.einsum('bk,bn->bkn', g, v).reshape(-1, DIM))
            if deck.stopped():
                print("stopped")
                return history
        history.append(total / max(1, len(P)))
        deck.line_push("c5", "loss", epoch + 1, history[-1])
        deck.scatter("c5", project(W)[:90], labels=vocab[:90], title=f"2-D projection of W, epoch {epoch + 1}", key="map")
        print(f"epoch {epoch + 1:>3}   pairs {len(P):>6}   lr {lr:.4f}   loss {history[-1]:.4f}")
        await deck.tick()
    return history

history = await train()`
  },
  {
    id: 'c6', title: 'Nearest neighbours by cosine similarity', slide: 'section 12',
    text: 'Normalise every row of W once; then cosine similarity is a dot product. Edit the query list and re-run.',
    code: `E = W / (np.linalg.norm(W, axis=1, keepdims=True) + 1e-9)

def neighbours(word, k=6):
    sims = E @ E[w2i[word]]
    best = [i for i in np.argsort(-sims) if i != w2i[word]][:k]
    return [(vocab[i], float(sims[i])) for i in best]

queries = ["king", "queen", "dog", "apple", "car", "paris"]
rows = []
for q in queries:
    if q not in w2i:
        continue
    nb = neighbours(q)
    print(f"{q:>8}: " + ", ".join(f"{w} {s:.2f}" for w, s in nb))
    rows.append([q] + [f"{w} {s:.2f}" for w, s in nb[:5]])
deck.table("c6", ["query", "1st", "2nd", "3rd", "4th", "5th"], rows)`
  },
  {
    id: 'c7', title: 'Analogies: a − b + c', slide: 'section 12',
    text: 'The query words themselves are excluded, as word2vec’s own analogy tool does. On a toy corpus this is hit and miss; that is an honest result, not a bug.',
    code: `def analogy(a, b, c, k=4):
    q = E[w2i[a]] - E[w2i[b]] + E[w2i[c]]
    q /= np.linalg.norm(q)
    sims = E @ q
    for w in (a, b, c):
        sims[w2i[w]] = -np.inf
    return [(vocab[i], round(float(sims[i]), 3)) for i in np.argsort(-sims)[:k]]

for a, b, c in [("king", "man", "woman"), ("prince", "boy", "girl"), ("paris", "france", "italy"), ("berlin", "germany", "japan")]:
    if all(w in w2i for w in (a, b, c)):
        print(f"{a} - {b} + {c}  =  {analogy(a, b, c)}")
    else:
        print(f"skipped {a} - {b} + {c}: a word is missing from the vocabulary")`
  },
  {
    id: 'c8', title: 'Look at the space in 3D', slide: 'section 2',
    text: 'Project W onto its top three principal components and explore it. Drag to rotate, scroll to zoom.',
    code: `xyz = project(W, 3)
xyz = xyz / (np.abs(xyz).max() + 1e-9) * 2.2
deck.scatter3d("c8", xyz[:120], labels=vocab[:120])
print("plotted", min(V, 120), "words")`
  },
  {
    id: 'c9', title: 'Going deeper: the count-based route', slide: 'section 13',
    text: 'Skip-gram with negative sampling implicitly factorises a shifted PMI matrix. Here we build that matrix explicitly from counts and factorise it with SVD, then compare neighbours with the trained vectors.',
    code: `Ccount = np.zeros((V, V))
for s in sentences:
    ids = [w2i[w] for w in s if w in w2i]
    for t, c in enumerate(ids):
        for j in range(max(0, t - WINDOW), min(len(ids), t + WINDOW + 1)):
            if j != t:
                Ccount[c, ids[j]] += 1

total = Ccount.sum()
pw = Ccount.sum(1, keepdims=True) / total
pc = Ccount.sum(0, keepdims=True) / total
with np.errstate(divide="ignore", invalid="ignore"):
    pmi = np.log((Ccount / total) / (pw * pc))
sppmi = np.nan_to_num(np.maximum(pmi - np.log(NEG), 0))     # shifted positive PMI

Uu, S, _ = np.linalg.svd(sppmi)
E_svd = Uu[:, :DIM] * np.sqrt(S[:DIM])
E_svd /= np.linalg.norm(E_svd, axis=1, keepdims=True) + 1e-9

for q in ["king", "dog", "apple", "paris"]:
    if q in w2i:
        sims = E_svd @ E_svd[w2i[q]]
        best = [vocab[i] for i in np.argsort(-sims) if i != w2i[q]][:5]
        print(f"SVD  {q:>7}: {', '.join(best)}")
        print(f"SGNS {q:>7}: {', '.join(w for w, _ in neighbours(q, 5))}\\n")`
  },
  {
    id: 'c10', title: 'Scratchpad', slide: '',
    text: 'Everything defined above is still in scope: <code>W</code>, <code>Wp</code>, <code>vocab</code>, <code>neighbours()</code>, <code>analogy()</code>, <code>train()</code>. Try a bigger <code>DIM</code>, a wider window, or paste your own corpus.',
    code: `print(neighbours("queen", 8))
print(analogy("queen", "woman", "man"))`
  }
];

const WORKSHOP = {
  title: 'Workshop', subtitle: 'build skip-gram from scratch, in real Python',
  packages: ['numpy'],
  data: {
    name: 'CORPUS', title: 'Corpus',
    text: 'One sentence per line. The default is a generated toy corpus with royalty, people, animals, food, vehicles and capitals, so clusters and analogies have something to find. Paste any text, or load a .txt file.',
    initial: () => toyCorpus2(7, 900), regenerate: () => toyCorpus2(Math.floor(Math.random() * 1e6), 900), regenerateLabel: 'regenerate toy corpus'
  },
  params: [
    { k: 'DIM', label: 'embedding dimension N', min: 3, max: 64, step: 1, v: 24 },
    { k: 'WINDOW', label: 'window m', min: 1, max: 6, step: 1, v: 3 },
    { k: 'NEG', label: 'negatives k', min: 1, max: 15, step: 1, v: 5 },
    { k: 'LR', label: 'learning rate α', min: .005, max: .2, step: .005, v: .05 },
    { k: 'EPOCHS', label: 'epochs', min: 1, max: 60, step: 1, v: 25 },
    { k: 'BATCH', label: 'mini-batch size', min: 16, max: 1024, step: 16, v: 256 },
    { k: 'MIN_COUNT', label: 'minimum count', min: 1, max: 10, step: 1, v: 2 },
    { k: 'SEED', label: 'random seed', min: 0, max: 99, step: 1, v: 1 }
  ],
  choices: [{ k: 'SUBSAMPLE_T', label: 'subsampling threshold t', options: [['off', 0], ['1e-1', .1], ['1e-2', .01], ['1e-3', .001], ['1e-4', 1e-4], ['1e-5', 1e-5]], v: .01 }],
  hint: "For a toy corpus, t = 1e-2 is sensible; the paper's 1e-5 is meant for billions of words.",
  colorOf: w => WORD_COLOR[w],
  cells: WS_CELLS
};
