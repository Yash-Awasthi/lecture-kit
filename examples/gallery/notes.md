# Building blocks gallery: speaking script

## Slide 1. Title

1. [1] What the kit draws: graphs, trees, flows, arrays, code, heatmaps, networks and 3D.

## Slide 2. Breadth-first search

**Keywords:** graph, queue, level.

1. [1] Seven nodes, undirected edges.
2. [2] Start at A. Take the oldest node from the queue, add its unseen neighbours. Order: A B C D E F G.

If asked: BFS finds shortest paths in edges in an unweighted graph, in O(V + E).

## Slide 3. Binary search tree

1. [1] Left smaller, right larger, at every node.
2. [2] In-order traversal reads it sorted: 20 30 40 50 60 70 80.

## Slide 4. A training loop as a pipeline

1. [2] Forward in blue (data, model, loss), backward in purple (gradient, update).

## Slide 5. Bubble sort, one pass

1. [2] Pointers j and j+1 walk right; the code line lights up as it runs; 8 ends in place.

## Slide 6. Attention weights as a heatmap

1. [1] Each row is one token's weights over all tokens; rows sum to 1.
2. [2] After training the weights concentrate: "sat" looks at "cat".

## Slide 7. Neurons, layers and activations

1. [2] Signals pulse forward layer by layer; ReLU, sigmoid and tanh are the usual activations.

## Slide 8. Gradient descent on a loss surface

1. [2] The ball follows −∇J downhill; drag to show the valley from the side.

## Slide 9. Tensors and layers in 3D

1. [1] Feature maps shrink in space and grow in channels, then a dense head classifies.
