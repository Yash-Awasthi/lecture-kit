'use strict';
/* Closing page: QR code to the slides on Google Drive, sources, thank you. */
const SOURCES = [
  'T. Mikolov, K. Chen, G. Corrado, J. Dean. <i>Efficient Estimation of Word Representations in Vector Space</i>. arXiv:1301.3781, 2013.',
  'T. Mikolov, I. Sutskever, K. Chen, G. Corrado, J. Dean. <i>Distributed Representations of Words and Phrases and their Compositionality</i>. NeurIPS 2013.',
  'Y. Bengio, R. Ducharme, P. Vincent, C. Jauvin. <i>A Neural Probabilistic Language Model</i>. JMLR 3, 2003.',
  'J. R. Firth. <i>A Synopsis of Linguistic Theory 1930–1955</i>. Studies in Linguistic Analysis, 1957.',
  'D. Jurafsky, J. H. Martin. <i>Speech and Language Processing</i>, 3rd ed. draft: ch. 3 (N-grams), ch. 6 (vector semantics).',
  'word2vec reference implementation, github.com/tmikolov/word2vec (word2vec.c).',
  'M. Grbovic, H. Cheng. <i>Real-time Personalization using Embeddings for Search Ranking at Airbnb</i>. KDD 2018.',
  'B. Perozzi, R. Al-Rfou, S. Skiena. <i>DeepWalk: Online Learning of Social Representations</i>. KDD 2014.',
  'J. Pennington, R. Socher, C. Manning. <i>GloVe: Global Vectors for Word Representation</i>. EMNLP 2014.',
  'P. Bojanowski, E. Grave, A. Joulin, T. Mikolov. <i>Enriching Word Vectors with Subword Information</i>. TACL 2017.',
  'T. Bolukbasi et al. <i>Man is to Computer Programmer as Woman is to Homemaker? Debiasing Word Embeddings</i>. NeurIPS 2016.',
  'J. Devlin, M. Chang, K. Lee, K. Toutanova. <i>BERT: Pre-training of Deep Bidirectional Transformers</i>. NAACL 2019.'
];

SLIDES.push(thanksSlide({
  institute: 'National Institute of Technology Raipur', logo: LOGO,
  qr: 'https://drive.google.com/drive/folders/1iotnkyNyofRyDkVE6qpQCK1fleAY4dFI?usp=sharing', qrLabel: 'slides on Google Drive', sources: SOURCES
}));
