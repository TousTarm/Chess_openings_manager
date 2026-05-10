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
