# Skip-Gram Models: speaking script

How to read this:
- Each slide lists the points to say, in order. `[2]` means "after the 2nd press of the right arrow on this slide".
- **Keywords** are the terms to say out loud (they also appear in the definition strip at the bottom of each slide).
- **If asked** lines are short answers for likely follow-up questions. Do not volunteer them unless asked.

Controls: Right = next step, Left = previous step, Ctrl+Right / Ctrl+Left = next / previous slide, Shift+Right = speed.
Launch: double-click `start-deck.bat` (deck from slide 1) or `start-workshop.bat` (straight to the workshop).

---

## Speaker split

| Part | Slides | Speaker |
|---|---|---|
| Introduction, N-grams, word vectors, distributional hypothesis, context windows, the model, architecture | 1 to 18 | A |
| Probability model, loss, optimisation, negative sampling, subsampling, using embeddings, summary, limitations | 19 to 37 | B |
| Workshop (runs the code and narrates) | 38 | A |
| Thank you and questions | 39 | B opens, both answer |

A = ____________________  B = ____________________

Handover lines:
- End of slide 18 (A): "That is the architecture. B will now show how the model turns scores into probabilities and how it learns."
- End of slide 37 (B): "Now A will build all of this from scratch in Python, live."

Questions: the owner of the section answers first. The other adds only if something is missing; never contradict each other in front of the professor.

---

## Notation

| Symbol | Meaning | In the code |
|---|---|---|
| V | vocabulary size (number of distinct words kept) | `V` |
| N | embedding dimension (hidden-layer size, length of every word vector) | `DIM` |
| T | number of tokens (positions) in the corpus | `n_tokens` |
| t | a position in the corpus | |
| w_t | the word at position t | |
| m | maximum window size (words on each side) | `WINDOW` |
| b | effective window actually used at one position, drawn uniformly from 1 to m | `b` |
| n, s | words in a sentence, window used in the pair-count formula | |
| c | center word (index) | `c`, `cs` |
| o | true context (outside) word | `o`, `true` |
| w | any vocabulary word | |
| x | one-hot input vector of the center word, length V | |
| h | hidden layer, h = xᵀW = v_c, length N | |
| W | V × N input matrix; row w is v_w | `W` |
| W′ | N × V output matrix; column w is u_w | `Wp` |
| v_w | center vector of word w (the embedding we keep) | `W[w]` |
| u_w | context vector of word w | `Wp[:, w]` |
| z_w | score (logit) of word w, z_w = u_w · v_c | |
| ŷ | predicted distribution, softmax(z), length V | `p` |
| y | one-hot truth, y_w = 1 only for w = o | |
| P(o \| c) | probability that o appears near c | |
| θ | all trainable parameters (every entry of W and W′), 2VN numbers | |
| L(θ) | likelihood of the corpus | |
| J(θ) | loss (negative average log-likelihood) | `total`, `history` |
| ∇J | gradient: vector of partial derivatives of J | |
| α | learning rate | `LR` |
| σ(x) | sigmoid, 1 / (1 + e^(−x)) | `sigmoid` |
| k | number of negative samples per true pair | `NEG` |
| w_i | the i-th negative (noise) word | `negs` |
| P_n(w) | noise distribution, ∝ count(w)^(3/4) | `noise` |
| f(w) | relative frequency of w, count(w) / T | `freq` |
| t (subsampling) | subsampling threshold, about 10⁻⁵ in the paper | `SUBSAMPLE_T` |
| cos(a, b) | cosine similarity, a · b / (‖a‖ ‖b‖) | `E @ E[i]` |
| ‖a‖ | length (norm) of a, √(a · a) | `np.linalg.norm` |
| aᵀ | transpose | |
| PMI | pointwise mutual information, log P(w, c) / (P(w) P(c)) | `pmi` |

Note on "t": it means a corpus position everywhere except slide 33 and the workshop's subsampling, where t is the threshold. Say "threshold t" there to avoid confusion.

---

## Slide 1. Title (A)

1. [1] Introduce both names and roll numbers.
2. Topic: skip-gram, a way of learning what words mean by predicting their neighbours.
3. The 3D cloud on the right starts as random points and snaps into clusters: that is what training does. We end the talk by building exactly this.

## Slide 2. Roadmap (A)

**Keywords:** language model, word embedding, skip-gram.

1. [1] Thirteen sections and a live workshop.
2. [2] We start at N-gram models (orange) because they show what goes wrong with counting, and we end at skip-gram (blue), which fixes it.
3. A **language model** gives a probability to word sequences. A **word embedding** is a dense vector per word. **Skip-gram** learns embeddings by predicting the words around each center word.

## Slide 3. N-gram language models (A)

**Keywords:** N-gram, chain rule, history, Markov assumption, bigram, trigram.

1. [1] An N-gram is a run of N consecutive words. Example sentence: "the cat sat on the warm mat".
2. [2] Chain rule: P(w₁, …, wₙ) = ∏ₜ P(wₜ | w₁, …, wₜ₋₁). This is an exact identity, not an approximation.
3. [3] The history grows with every word (length 1, 2, … 6). Long histories almost never repeat in a corpus, so they cannot be estimated.
4. [4] Markov assumption: keep only the last N − 1 words. P(wₜ | w₁ … wₜ₋₁) ≈ P(wₜ | wₜ₋ₙ₊₁ … wₜ₋₁). Bigram, N = 2: remember 1 word.
5. [5] Trigram, N = 3: remember 2 words.

If asked: the approximation enters only with the Markov step; the chain rule itself is exact.

## Slide 4. Estimation by counting (A)

**Keywords:** corpus, maximum likelihood estimation, closed form.

1. [1] Corpus of three sentences: "i like nlp", "i like deep learning", "i enjoy flying".
2. [2] MLE for a bigram: P(wₜ | wₜ₋₁) = count(wₜ₋₁, wₜ) / count(wₜ₋₁).
3. [3] "i like" appears twice.
4. [4] "i" appears three times, so P(like | i) = 2/3 ≈ 0.67.
5. [5] Full distribution after "i": like 2/3, enjoy 1/3, everything else 0. Closed form: count once and divide, no training loop.

If asked, why a ratio of counts: maximising the likelihood of the counts under the constraint that the probabilities sum to 1 (Lagrange multiplier) gives exactly count / total. Sentence-start markers ⟨s⟩ are left out here for simplicity.

## Slide 5. Where counting breaks (A)

**Keywords:** data sparsity, smoothing, combinatorial explosion, long-range dependency, generalisation.

1. [1] Four problems.
2. [2] Data sparsity: the count table is almost all empty. count(i enjoy nlp) = 0, so P = 0 for a perfectly valid sentence. Smoothing (add-one, backoff) only patches the zeros.
3. [3] Combinatorial explosion: with V = 10,000 there are Vᴺ possible N-grams: 10⁴, 10⁸, 10¹², 10¹⁶, 10²⁰ for N = 1 to 5.
4. [4] Short memory: "the keys i left in the car are lost". A trigram sees only "the car" before "are"; the agreement with "keys" is out of reach. That is a long-range dependency.
5. [5] No similarity: cat is symbol #3017, dog is symbol #8122. Seeing "the cat sat" teaches nothing about "the dog sat". This last problem is the one skip-gram fixes.

## Slide 6. One-hot encoding (A)

**Keywords:** vocabulary, one-hot vector, orthogonal.

1. [1] Vocabulary of 8 words with indices 0 to 7.
2. [2] cat is index 2: a vector with a single 1 at position 2 and 0 elsewhere.
3. [3] dog (index 3) and car (index 1) the same way.
4. [4] cat · dog = 0 and cat · car = 0. ‖cat − dog‖ = ‖cat − car‖ = √2. Every pair is equally unrelated.
5. [5] Length V (10⁴ to 10⁵), exactly one non-zero entry, all vectors orthogonal and equidistant. One-hot encodes identity, not meaning.

## Slide 7. Sparse labels vs a dense space (A)

**Keywords:** sparse representation, dense representation, dimension.

1. [1] One-hot in 3D: one axis per word, every tip is 1.41 (√2) from every other. Drag to rotate.
2. [2] Dense: positions are learned, so cat and dog move close together while car sits apart. The distances on the dashed edges update.
3. Dense vectors are low-dimensional (50 to 300) with real-valued entries, and the dimensions are learned, not hand-designed.

If asked: the dense positions here are illustrative, chosen by hand to show the idea.

## Slide 8. A word embedding space (A)

**Keywords:** word embedding, latent feature, cluster.

1. [1] Words become points. In skip-gram a word's embedding is its row of W.
2. [2] Five groups (animals, vehicles, food, royalty, motion verbs) move from random positions into clusters. Training does this: words used in similar ways end up close.
3. The axes are latent features: discovered by training, not labelled, usually not interpretable one by one.

If asked: real embeddings have 100 to 300 dimensions; this 3D picture is synthetic.

## Slide 9. Distributional hypothesis (A)

**Keywords:** distributional hypothesis, context, co-occurrence.

1. [1] "You shall know a word by the company it keeps." J. R. Firth, 1957. Words in similar contexts tend to have similar meanings.
2. [2] Three words (dog, puppy, car) and seven context words (barks, fed, vet, walk, park, fuel, drive).
3. [3] Lines show which contexts each word co-occurs with.
4. [4] dog and puppy share 4 contexts (barks, fed, vet, walk), so they will get similar vectors.
5. [5] car shares only "park" with them.
6. Skip-gram uses no dictionary and no labels; meaning comes only from co-occurrence.

If asked: the same idea was stated by Zellig Harris (1954, "Distributional Structure").

## Slide 10. Center word, context window, training pairs (A)

**Keywords:** center word, context window, training pair, self-supervised.

1. [1] Sentence: "the quick brown fox jumps over the lazy dog", n = 9 words.
2. [2] Center word fox at position t. Window m = 2: positions t − 2 to t + 2, excluding t: quick, brown, jumps, over.
3. [3] One training pair per neighbour: (fox, quick), (fox, brown), (fox, jumps), (fox, over).
4. [4] Slide the window over every position. At the edges the window is truncated. Total: 30 pairs.
5. [5] Formula: pairs = s(2n − s − 1) = 2(18 − 2 − 1) = 30.
6. The labels come from the text itself: self-supervised, no annotation.

If asked, derivation: pairs at distance d exist in both directions, 2(n − d) of them. Sum over d = 1 to s: 2sn − s(s + 1) = s(2n − s − 1). Valid when s ≤ n − 1, with a fixed window.

## Slide 11. Window size changes what "similar" means (A)

**Keywords:** syntactic similarity, topical similarity, truncated window.

1. [1] Sentence: "a vet said my dog chased the cat across the park", center dog.
2. [2] Small window (2 to 5): neighbours are grammatical partners ("my dog", "dog chased"). dog ≈ cat, puppy, horse: same grammatical role.
3. [3] Large window (5 to 10+): neighbours share a topic (vet, park, cat). dog ≈ vet, leash, park, bark.
4. [4] At a sentence edge the window is truncated: the first word has only right-hand neighbours.

If asked: this is a tendency observed in practice, not a hard rule.

## Slide 12. Dynamic window (A)

**Keywords:** dynamic window, effective window b, hyperparameter.

1. [1] Maximum window m = 5, a hyperparameter (set before training, not learned). Bars will count how often each distance d = 1 to 5 is used.
2. [2] For each center word, word2vec draws an effective window b uniformly from 1 to m and uses only neighbours within distance b. Sixty random draws: the frame grows and shrinks, the bars fill up.
3. [3] Distance d is used only when b ≥ d, so P(distance d used) = (m − d + 1) / m: 1.0, 0.8, 0.6, 0.4, 0.2. The bars settle on the dashed lines.
4. Nearer words therefore get more weight, falling linearly with distance, and the average window is (m + 1) / 2, so training is also faster.

If asked: in word2vec.c this is `b = rand() % window`, effective window = window − b. In the workshop it is `rng.integers(1, window + 1)` in cell 3.

## Slide 13. Skip-gram: predict the neighbours (A)

**Keywords:** skip-gram, word2vec, pretext task.

1. [1] Skip-gram (Mikolov et al., 2013): given the center word, here fox…
2. [2] …predict every word in its window: P(w_{t−2} | fox), P(w_{t−1} | fox), P(w_{t+1} | fox), P(w_{t+2} | fox).
3. [3] The answers are quick, brown, jumps, over. Unlike an N-gram it looks at both sides, and it predicts neighbours, not the next word.
4. [4] It is a pretext task: after training the predictions are thrown away. The word vectors are the real product.

## Slide 14. word2vec has two architectures (A)

**Keywords:** CBOW, training signal, rare word.

1. [1] CBOW (continuous bag of words): average the context vectors, predict the center word.
2. [2] Skip-gram: center word, predict each context word.
3. [3] Table: CBOW makes one prediction per window and is faster; skip-gram makes one per context word and is slower. CBOW shines on frequent words and large data, skip-gram on rare words and smaller data.
4. Why skip-gram helps rare words: each occurrence gives one update per neighbour, instead of a single averaged update.

## Slide 15. The network, neuron by neuron (A)

**Keywords:** neuron, hidden layer (linear), weight matrices, embedding dimension N.

1. [1] Three layers: V input neurons, N hidden neurons, V output neurons. W ∈ ℝ^{V×N} connects input to hidden, W′ ∈ ℝ^{N×V} hidden to output. Toy sizes: V = 8, N = 3.
2. [2] fox enters as a one-hot vector: a single 1 among V zeros.
3. [3] Only the edges leaving fox carry signal, so the hidden layer receives row fox of W: the embedding v_c = (0.8, −0.3, 0.5). The hidden layer has no activation: f(h) = h.
4. [4] Every output neuron computes a score z_w = u_w · v_c: how well w fits as a neighbour of fox. quick scores highest (about 2.0).
5. [5] Softmax turns the V scores into probabilities P(w | fox) that add to 1.
6. [6] The true neighbour is quick, P(quick | fox) = 0.32, so the loss is −log 0.32 = 1.14.
7. [7] Backpropagation sends the error back: only row fox of W changes, plus the columns of W′.

If asked: no bias terms and no non-linearity in the hidden layer, so it is a shallow, log-linear model, not deep learning.

## Slide 16. Multiplying by a one-hot vector is a lookup (A)

**Keywords:** matrix product xᵀW, row lookup, embedding of a word.

1. [1] xᵀ is 1 × V, W is V × N, the result h is 1 × N. Each output entry is a weighted sum down one column of W, weighted by x.
2. [2] x has a single 1 at fox, so every row except fox's is multiplied by 0.
3. [3] Row fox flies into h.
4. [4] xᵀW = W_{fox,:} = v_c. Real code never multiplies; it indexes `W[c]`. That row is the word's embedding and also the hidden layer.

## Slide 17. Function flow: forward and backward (A)

**Keywords:** forward pass, backpropagation, chain rule, gradient.

1. [1] The chain: x (one-hot, V) → lookup with W → v_c (N) → dot with every u_w, using W′ → z (V scores) → softmax → ŷ (V probabilities) → −log ŷ_o, using the true y → J (the loss).
2. [2] Forward pass: each function feeds the next, ending in one number, the loss J.
3. [3] Backward pass: the chain rule walks the same graph in reverse.
   - ∂J/∂z = ŷ − y (the error signal)
   - ∂J/∂v_c = W′(ŷ − y)
   - ∂J/∂W′ = v_c (ŷ − y)ᵀ, an N × V outer product
   - ∂J/∂W_{c,:} = ∂J/∂v_c: only row c of W gets a gradient.

If asked: ŷ − y is the standard derivative of softmax followed by cross-entropy.

## Slide 18. Two vectors for every word (A)

**Keywords:** center vector v_w, context vector u_w, parameter.

1. [1] W (rows) and W′ (columns), both indexed by the same words.
2. [2] Row fox of W is v_fox, the center vector: used when fox is the center.
3. [3] Column fox of W′ is u_fox, the context vector: used when fox is a candidate neighbour.
4. [4] Why two: with one shared vector, P(fox | fox) ∝ e^{‖v‖²} would always be large, yet a word rarely appears in its own window. Two roles also keep the gradients simple. After training we keep W.
5. [5] Parameters: VN + NV = 2VN. With V = 10,000 and N = 300 that is 6,000,000, linear in V (compare Vᴺ for N-grams).

If asked: some implementations average or add v_w and u_w; word2vec.c saves only W.

Handover to B.

---

## Slide 19. The dot product measures alignment (B)

**Keywords:** dot product, norm, projection.

1. [1] Two vectors a and b.
2. [2] a · b = Σᵢ aᵢbᵢ = ‖a‖ ‖b‖ cos θ.
3. [3] The gold bar is the projection (shadow) of b on a, signed length a · b / ‖a‖. Rotate b: positive when they point the same way, zero at right angles, negative when opposed.
4. [4] This is why u_w · v_c works as a "fits as a neighbour" score.

If asked: the dot product also grows with vector length, which is why we switch to cosine for similarity on slide 34.

## Slide 20. Softmax: scores into probabilities (B)

**Keywords:** score (logit), softmax, probability distribution.

1. [1] Scores z_w = u_w · v_c for six candidates: quick 2.0, the 1.6, brown 1.0, jumps 0.1, over −0.5, lazy −1.2. Scores can be any real number.
2. [2] Exponentiate: e^{z} is always positive. Their sum is 17.07.
3. [3] Divide by the sum: quick 0.43, the 0.29, brown 0.16, jumps 0.07, over 0.04, lazy 0.02. They now sum to 1.
4. [4] softmax(z)_w = e^{z_w} / Σⱼ e^{z_j}.
5. [5] Raise z_quick from 2.0 to 3.8: P(quick) goes from 0.43 to 0.82 and every other bar shrinks. Probabilities compete.
6. [6] Back to 2.0.

If asked: adding the same constant to every score does not change softmax, so code subtracts the maximum first to avoid overflow (`z - z.max()` in workshop cell 4).

## Slide 21. The skip-gram probability (B)

**Keywords:** conditional probability, normaliser, independence assumption.

1. [1] P(o | c) = exp(u_o · v_c) / Σ_{w=1}^{V} exp(u_w · v_c).
2. [2] Numerator: the dot product, how aligned the context vector and center vector are.
3. [3] Denominator: the normaliser, one term for every one of the V words. This is what makes it expensive (remember it for slide 30).
4. [4] Three steps: score every word against the center, exponentiate, divide by the sum.
5. [5] Independence assumption: P(w_{t−m}, …, w_{t+m} | w_t) = ∏_{j≠0} P(w_{t+j} | w_t). Each neighbour is predicted separately from the same distribution; the position inside the window is ignored.

## Slide 22. From likelihood to a loss (B)

**Keywords:** likelihood L(θ), log-likelihood, loss function J(θ), underflow.

1. [1] Likelihood of the corpus: L(θ) = ∏_{t=1}^{T} ∏_{−m≤j≤m, j≠0} P(w_{t+j} | w_t; θ). θ is every entry of W and W′.
2. [2] Multiply 1,000 probabilities of 0.01: the result is 10⁻²⁰⁰⁰, which underflows to exactly 0 (doubles stop around 10⁻³⁰⁸).
3. [3] Take logs: products become sums. 1,000 × ln 0.01 = −4605.17, perfectly representable. The log is increasing, so log L has the same maximiser.
4. [4] J(θ) = −(1/T) Σₜ Σⱼ log P(w_{t+j} | w_t; θ). The minus sign turns maximising into minimising, which optimisers expect; 1/T makes it an average.

## Slide 23. The price of being wrong: −log p (B)

**Keywords:** negative log-likelihood, cross-entropy, confidently wrong.

1. [1] Loss for one pair: −log P(o | c), plotted against P(o | c).
2. [2] At P = 0.9 the loss is 0.11; slide P down to 0.02 and the loss is 3.91.
3. [3] The red zone is "confidently wrong": tiny probability for what actually happened. The loss is 0 at P = 1 and grows without bound as P → 0.
4. [4] Cross-entropy H(y, ŷ) = −Σ_w y_w log ŷ_w. With one-hot y only the true word's term survives: −log ŷ_o. Same loss, two names.

If asked: natural log; another base only rescales the loss.

## Slide 24. Gradient descent and the learning rate (B)

**Keywords:** gradient descent, learning rate α, convergence, divergence.

1. [1] θ_new = θ_old − α ∇J(θ_old). The gradient points uphill, so step against it. Three runs on J = x², starting at x = −2.
2. [2] α = 0.05 crawls, α = 0.3 is about right, α = 1.04 overshoots and diverges.

If asked: on x² the update is x ← (1 − 2α)x, so the factors are 0.9, 0.4 and −1.08. It converges only for 0 < α < 1.

## Slide 25. Descending a loss surface (B)

**Keywords:** loss surface, parameters θ, steepest descent.

1. [1] The loss drawn as a height over two parameters. Drag to rotate.
2. [2] The purple arrow is −∇J, steepest descent from the current point. The ball follows it downhill.
3. [3] The real model has 2VN parameters, so it cannot be drawn, but each step does exactly this.

If asked: the skip-gram loss is not convex (it multiplies u by v), so there is no guarantee of a global minimum; in practice SGD finds good solutions. The surface here is a made-up function.

## Slide 26. Stochastic gradient descent (B)

**Keywords:** stochastic gradient descent, mini-batch, epoch.

1. [1] Contour lines with the minimum marked.
2. [2] Full gradient descent: each step sums the gradient over every pair. Smooth, but one step costs a full pass over the corpus.
3. [3] SGD: each step uses one pair or a mini-batch. Noisy, but cheap, so millions of steps are affordable. word2vec uses SGD.
4. [4] Training loop: initialise W and W′ with small random values, pick a pair, forward pass, loss, gradients, update, repeat. One epoch is one full pass over all pairs.

If asked: word2vec decays α linearly to almost zero over training; the workshop does the same (cell 5).

## Slide 27. Gradient for the center vector (B)

**Keywords:** expected context vector, ∂J/∂v_c, update.

1. [1] v_c (fox) and the context vectors, with u_o = quick as the true neighbour.
2. [2] Each context vector weighted by P(w | c).
3. [3] Their weighted sum Σ_w P(w | c) u_w is the expected context vector: the model's average guess.
4. [4] ∂J/∂v_c = −u_o + Σ_w P(w | c) u_w: truth versus expectation.
5. [5] Update v_c ← v_c − α ∂J/∂v_c: v_c moves toward the true context vector and away from the current guess.

If asked, derivation: J = −u_o · v_c + log Σ_w exp(u_w · v_c); the derivative of the log-sum-exp is the softmax-weighted average of the u_w.

## Slide 28. Gradient for the context vectors (B)

**Keywords:** prediction error P − y, target y_w, push and pull.

1. [1] ∂J/∂u_w = (P(w | c) − y_w) v_c. P(w | c) − y_w is the prediction error.
2. [2] Bars: P(w | c), then P − y. Negative for the true word (P − 1), positive for every other word.
3. [3] u_o is pulled toward v_c; every wrong word is pushed away in proportion to the probability it took.
4. Words with similar contexts receive similar updates, so they drift together. That is where clusters come from.
5. Every one of the V columns gets an update for every pair, which is the cost problem negative sampling solves.

## Slide 29. Watch it learn (B)

**Keywords:** training, embedding cluster, loss curve.

1. [1] A real skip-gram trained live in the browser, with N = 2 so we can plot it. Toy corpus of 1,600 short sentences, four groups (animals, vehicles, food, royalty), each with its own context words, window 2.
2. [2] Training runs: the loss curve falls and the four groups separate into clusters.
3. [3] Nobody told it the groups; they come only from shared contexts.

Say this up front, it is the obvious nitpick: "For speed this demo already uses negative sampling with 3 random negatives, which is the next slide."

## Slide 30. Negative sampling: real pair or fake pair? (B)

**Keywords:** negative sampling, positive pair, negative sample, k.

1. [1] J = −log σ(u_o · v_c) − Σ_{i=1}^{k} log σ(−u_{w_i} · v_c). A full softmax touches all V words per pair; this touches only the true pair and k random ones.
2. [2] First term, the real pair: push its score up. Second term, k fake pairs: push their scores down. k is about 5 to 20 for small data, 2 to 5 for large data.
3. [3] In 2D: fox (blue), the true neighbour quick (green), three random negatives galaxy, violin, tax (red).
4. [4] Bars show σ(u · v_c), the probability the pair is real.
5. [5] Gradient steps: quick's bar rises, the fakes' bars fall; quick moves toward fox, the fakes move away.

If asked:
- Introduced in Mikolov et al., NeurIPS 2013 ("Distributed Representations…"); the first paper used hierarchical softmax.
- It is a simplification of noise-contrastive estimation (NCE). It does not produce normalised probabilities, which is fine because we only want the vectors.
- Cost per pair: full softmax O(VN), hierarchical softmax O(N log V), negative sampling O((k + 1)N).

## Slide 31. The sigmoid (B)

**Keywords:** sigmoid σ(x), activation function, binary classification.

1. [1] σ(x) = 1 / (1 + e^{−x}) squashes any score into (0, 1). Here it is the probability that a pair is real: a binary classifier.
2. [2] Move x from −4 to 4: σ goes from 0.018 to 0.982.
3. [3] The mirror curve is σ(−x). Since σ(−x) = 1 − σ(x), it is the probability that the pair is fake. The two bars always stack to 1.
4. So the fake-pair term −log σ(−u · v_c) rewards the model for calling the noise fake.
5. Both terms then have the same form, −log σ(±score), and both gradients are σ(score) − label: the line `g = s - y` in workshop cell 5.

If asked: skip-gram's hidden layer has no activation; σ appears only at the output.

## Slide 32. Which words become negatives? (B)

**Keywords:** unigram distribution, noise distribution P_n, exponent 3/4.

1. [1] P_n(w) ∝ count(w)^α. At α = 1 (raw frequency) "the" is 45.3% and "zebra" 0.18%: negatives are nearly always "the", "of", "and".
2. [2] α = 0 (uniform): every word 14.3%, so rare words become negatives far too often.
3. [3] α = 3/4: "the" 40.0%, "zebra" 0.64%. The giants are damped and rare words get about 3.5 times more chances. 3/4 was chosen empirically.
4. [4] Per pair only k + 2 = 7 vectors are updated (center, true context, 5 negatives), instead of V + 1 = 100,001.

## Slide 33. Subsampling frequent words (B)

**Keywords:** subsampling, relative frequency f(w), threshold t.

1. [1] P(discard w) = 1 − √(t / f(w)), applied to each occurrence before making pairs.
2. [2] With t = 10⁻⁵: "the" (f = 0.05) is dropped 99% of the time, "of" 98%, "cat" 68%, "zebra" 0%. Words with f(w) ≤ t are never dropped. Frequent words co-occur with everything, so their pairs carry little information while eating training time.
3. [3] "the cat sat on the mat by the door": all three "the" are struck out. Effect: faster training and better vectors for the rarer, informative words.

If asked:
- The released word2vec.c uses a slightly different formula (keep probability (√(f/t) + 1) · t/f) and a default threshold of 10⁻³. The formula on the slide is the one from the paper.
- The workshop uses t = 10⁻² by default because the toy corpus has only about 5,600 tokens.

## Slide 34. Cosine similarity and nearest neighbours (B)

**Keywords:** cosine similarity, nearest neighbours, why ignore length.

1. [1] Four groups of words as 2D vectors from the origin.
2. [2] cos(a, b) = a · b / (‖a‖ ‖b‖), from −1 (opposite) through 0 to 1 (same direction). Vector length mostly reflects frequency and training dynamics, not meaning, so we ignore it.
3. [3] Query dog: the wedge grows around dog's direction.
4. [4] The nearest words by cosine are listed. Cosine looks at angle, not distance: a far word in the same direction beats a near word in another direction.

## Slide 35. Analogies as vector arithmetic (B)

**Keywords:** analogy a : b :: c : ?, vector offset, emergent property.

1. [1] v_king − v_man + v_woman ≈ v_queen. An analogy a : b :: c : ? is solved as b − a + c, then the nearest word, excluding the three query words.
2. [2] Gender offset: man → woman, king → queen, boy → girl are nearly parallel.
3. [3] Royalty offset: man → king, woman → queen.
4. [4] Start at king, add (woman − man): it lands next to queen.
5. This is emergent: never trained for, approximate, and best with large corpora.

If asked:
- Without excluding the query words, the nearest word is usually "king" itself.
- Mikolov's analogy test set has 19,544 questions (semantic and syntactic).
- The 3D positions on this slide are illustrative.

## Slide 36. N-gram vs skip-gram (B)

**Keywords:** generalisation, closed form vs iterative.

1. [1] Go row by row:
   - task: next word vs context
   - direction: one-sided vs both sides
   - representation: symbols vs dense vectors
   - estimation: counting vs gradient descent
   - unseen combinations: zero vs generalises
   - parameters: Vᴺ vs 2VN
   - output: sentence probabilities vs embeddings
   - skip-gram cannot score or generate sentences.
2. Key point: similar words share similar vectors, so evidence about one word helps its neighbours.

## Slide 37. Limitations, successors and real-world use (B)

**Keywords:** polysemy, out-of-vocabulary, contextual embedding.

1. [1] "bank" (river bank, money bank) gets one static vector blending every sense.
2. [2] Limitations:
   - polysemy
   - out-of-vocabulary words have no vector
   - not a language model
   - bias: it reflects the corpus, stereotypes included (Bolukbasi et al., 2016)
   - word order inside the window is ignored.
3. [3] Where it runs today: recommendation, with sessions or baskets used as sentences (Airbnb listing embeddings, 2018); graphs, with random walks used as sentences (DeepWalk 2014, node2vec 2016); search and NLP pipelines, using pretrained vectors as features.
4. [4] What came next:
   - GloVe (2014): the same co-occurrence statistics, fitted directly
   - fastText (2016): character n-gram (subword) vectors, so rare and unseen words get vectors
   - ELMo and BERT (2018): a different vector for each context, which fixes polysemy.

Handover to A.

---

## Slide 38. Workshop (A)

Before the talk:
- Open it once with `start-workshop.bat` and wait for "Python ready" in the top bar.
- Do not press "regenerate toy corpus" before the demo; the numbers below come from the default corpus.

General points to say first:
1. This is real CPython and numpy compiled to WebAssembly (Pyodide), running inside the browser, fully offline.
2. Left panel: hyperparameters. Changes apply the next time a cell runs. After changing a slider, press "run all" (cells that already ran do not rerun by themselves).
3. Each cell maps to slides; the slide numbers are shown on the right of every cell.

Default settings: N = 24, m = 3, k = 5, α = 0.05, 25 epochs, batch 256, min count 2, seed 1, threshold t = 10⁻².

### Cell 0. Corpus

1. A generated toy corpus, one sentence per line, with royalty, people, animals, food, vehicles and capitals, so clusters and analogies have something to find.
2. You can paste any text or load a .txt file.

### Cell 1. Tokenise and build the vocabulary (slides 4, 10)

1. Lowercase, split into words, count, keep words with count ≥ MIN_COUNT.
2. Expected output: 900 sentences, 5,598 tokens, V = 120. Most common word: "the", 1,021 times.
3. V fixes the shape of both matrices.

### Cell 2. Subsampling and the noise distribution (slides 32, 33)

1. `p_discard = 1 − √(t / f)`; `noise = freq ** 0.75`, then renormalised.
2. "the": frequency 0.18, discard 0.77, noise 0.093. Rare words: discard 0.
3. Bar chart: the unigram bars shrink for the giants and grow for the rare words under the 3/4 power.

### Cell 3. Slide the window: (center, context) pairs (slides 10, 12)

1. `make_pairs`: for each position draw b from 1 to WINDOW (dynamic window), then emit one pair per neighbour within b. Subsampling is applied first.
2. About 11,664 pairs per epoch. The count changes each epoch because b and subsampling are random.
3. The check on the first sentence: n = 7, s = 3, counted 30 = s(2n − s − 1) = 30.

### Cell 4. The model and one full-softmax step (slides 15 to 18, 27, 28)

1. `W` is V × N, small random values; `Wp` (W′) is N × V, all zeros (the word2vec.c initialisation).
2. Parameters: 2VN = 2 × 120 × 24 = 5,760.
3. Because W′ starts at zero, every score is 0 and P(o | c) = 1/V = 0.0083, loss = ln 120 = 4.787.
4. 25 full-softmax steps on one pair using exactly the slide gradients (`err = p - y`, `W[c] -= lr * (Wp @ err)`, `Wp -= lr * outer(v, err)`): P(o | c) rises to 0.99.
5. This deliberately overfits one pair, to show that the gradients work.

### Cell 5. Train with negative sampling (slides 26, 30, 31)

1. Mini-batch SGD on the negative-sampling loss. Learning rate decays linearly, as in word2vec.c.
2. Per batch:
   - draw k negatives from `noise`
   - scores `s = σ(v · U)`
   - error `g = s − y`, the line from slide 31
   - update with `np.add.at`, because a word can appear several times in one batch.
3. After each epoch: loss point and a 2D PCA projection of W. Watch the clusters form.
4. Loss per pair starts near (k + 1) ln 2 = 4.16 (all σ = 0.5 at the start) and ends around 1.2.
5. The stop button interrupts training.

If asked:
- word2vec.c does pure per-pair SGD over several threads; mini-batches are used here because numpy is fast on arrays.
- word2vec.c skips a negative that equals the true word; this code does not (rare with V = 120, and harmless).

### Cell 6. Nearest neighbours (slide 34)

1. Normalise every row of W once; cosine is then a dot product.
2. Expected: king: prince, queen, princess. dog: horse, kitten, cat, puppy. car: bus, train, bike, truck. paris: madrid, tokyo, rome, berlin.
3. Edit the query list and re-run.

### Cell 7. Analogies (slide 35)

1. b − a + c, normalised, the query words excluded.
2. Expected:
   - king − man + woman = queen (0.939)
   - prince − boy + girl = princess
   - paris − france + italy = rome
   - berlin − germany + japan = tokyo
3. On a toy corpus this is hit and miss; that is an honest result.

### Cell 8. 3D view (slides 7, 8)

1. Top 3 principal components of W. Drag to rotate, scroll to zoom. The groups are visible as clusters.

### Cell 9. The count-based route (beyond the slides)

1. Count co-occurrences with a fixed window: `Ccount[c, o]`.
2. PMI = log P(c, o) / (P(c) P(o)): how much more often the pair occurs than chance.
3. Shifted positive PMI: max(PMI − log k, 0). Levy and Goldberg (2014): skip-gram with negative sampling implicitly factorises exactly this matrix.
4. SVD, keep the top N dimensions, `U[:, :N] · √S`, then compare neighbours with the trained vectors.
5. On this tiny corpus SVD leans toward words that appear next to the query (king: lives, rules, castle), while skip-gram finds words that could replace it (queen, prince). On large corpora the two are much closer.

### Cell 10. Scratchpad

1. Everything above is still in scope: `W`, `Wp`, `vocab`, `neighbours()`, `analogy()`, `train()`.
2. Default code: `neighbours("queen", 8)` and `analogy("queen", "woman", "man")`. The analogy should give "king"; on this corpus it gives prince 0.935 then king 0.924, a near miss.
3. Things to type live:
   ```python
   print(neighbours("paris", 8))
   print(analogy("tokyo", "japan", "france"))
   history = await train(epochs=40)
   print(analogy("king", "man", "woman"))
   ```

---

## Slide 39. Thank you (B)

1. Thank the professor; questions welcome.
2. The QR code links to the slides on Google Drive; the sources are listed (Mikolov 2013 twice, Bengio 2003, Firth 1957, Jurafsky and Martin, word2vec.c, Airbnb 2018, DeepWalk, GloVe, fastText, Bolukbasi 2016, BERT).

---

## Questions to expect

Who, when:
- Mikolov, Chen, Corrado, Dean (Google), 2013.
- First paper (arXiv 1301.3781): CBOW and skip-gram, with hierarchical softmax.
- Second paper (NeurIPS 2013): negative sampling, subsampling, phrases.

Is it deep learning?
- No. One linear hidden layer with no activation: a shallow, log-bilinear model.

Why is the embedding the hidden layer?
- Because xᵀW with one-hot x is exactly row c of W (slide 16).

Why keep W and not W′?
- Convention. word2vec.c saves W. Averaging the two also works.

Why two vectors?
- See slide 18. With one shared vector the self-score ‖v‖² is always high, and the gradients get messier.

Why the logarithm?
- Underflow, products become sums, and the maximiser is unchanged (slide 22).

Why does softmax plus cross-entropy give ŷ − y?
- Differentiate −z_o + log Σ e^{z_w}: the second term gives softmax(z), the first gives −y.

Why is the full softmax expensive?
- The normaliser sums over all V words and every u_w gets updated: O(VN) per pair.

Hierarchical softmax?
- A binary (Huffman) tree over the vocabulary. P(o | c) is a product of about log₂ V sigmoids along the path, so the cost is O(N log V).

Negative sampling vs NCE?
- Negative sampling drops NCE's correction term, so it does not estimate normalised probabilities. Good for vectors, not for a language model.

Why the power 3/4?
- Empirical: it worked best in the paper's experiments. It sits between raw frequency (1) and uniform (0).

What does training converge to?
- With negative sampling, at the optimum u_w · v_c ≈ PMI(w, c) − log k (Levy and Goldberg, 2014). That is workshop cell 9.

Is the loss convex?
- No: it is bilinear in u and v. SGD still finds good solutions in practice.

How to choose N?
- 100 to 300 is typical. Too small underfits; too large needs more data and time.

Why min count?
- Words seen once or twice cannot get reliable vectors and they inflate V.

Does skip-gram use word order?
- Only through the window. Inside the window, position is ignored (slide 21).

How is it evaluated?
- Intrinsically: word similarity datasets and the analogy test set.
- Extrinsically: as features in downstream tasks.

Usual word2vec.c defaults (if asked for numbers):
- dimension 100, window 5, negatives 5
- sample threshold 10⁻³
- α = 0.025 for skip-gram, 0.05 for CBOW
- min count 5, 5 epochs.
