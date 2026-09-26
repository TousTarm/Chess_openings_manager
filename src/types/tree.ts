export interface TreeNode {
  id: string
  san: string   // SAN of the move that led to this position; '' for root
  fen: string   // FEN of this position
  note: string  // per-node annotation
  children: TreeNode[]
}

export interface OpeningTree {
  id: string
  name: string
  color: 'white' | 'black'
  root: TreeNode
  createdAt: string
  updatedAt: string
}

/** Unique id generator */
export function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Walk the tree and find a node by id. Returns null if not found. */
export function findNode(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

/** Replace a node in the tree (immutably). Returns new root. */
export function replaceNode(root: TreeNode, updated: TreeNode): TreeNode {
  if (root.id === updated.id) return updated
  return { ...root, children: root.children.map(c => replaceNode(c, updated)) }
}

/** Longest path length in plies from this node (0 if leaf). */
export function maxDepth(node: TreeNode): number {
  if (!node.children.length) return 0
  let best = 0
  for (const child of node.children) {
    const d = maxDepth(child)
    if (d > best) best = d
  }
  return 1 + best
}

/**
 * Count alternative branches off the mainline (children[0] path).
 * Each extra sibling of a mainline child counts as one fork.
 */
export function forksFromMainline(root: TreeNode): number {
  let forks = 0
  let node = root
  while (node.children.length > 0) {
    forks += node.children.length - 1
    node = node.children[0]
  }
  return forks
}

/** Walk mainline (first child) and collect SANs, up to `limit`. */
export function mainlineSans(root: TreeNode, limit = Infinity): string[] {
  const sans: string[] = []
  let node = root
  while (node.children.length > 0 && sans.length < limit) {
    node = node.children[0]
    sans.push(node.san)
  }
  return sans
}
