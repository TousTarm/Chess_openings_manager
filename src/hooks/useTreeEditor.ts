import { useState, useRef, useCallback, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { newId, replaceNode, type TreeNode, type OpeningTree } from '../types/tree'
import { storage } from '../lib/storage'

export interface UseTreeEditorReturn {
  tree: OpeningTree
  currentNode: TreeNode
  path: TreeNode[]          // from root to currentNode (inclusive)
  fen: string
  selectedSquare: string | null
  legalTargets: string[]
  lastMove: { from: string; to: string } | null
  flipped: boolean
  clickSquare: (square: string) => void
  onPieceDrop: (from: string, to: string) => boolean
  navigateBack: () => void
  navigateForward: () => void
  navigateTo: (pathIndex: number) => void
  navigateToNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  resetBoard: () => void
  flipBoard: () => void
  updateNote: (note: string) => void
}

function findPathToNode(root: TreeNode, targetId: string): TreeNode[] | null {
  function search(node: TreeNode, acc: TreeNode[]): TreeNode[] | null {
    const next = [...acc, node]
    if (node.id === targetId) return next
    for (const child of node.children) {
      const result = search(child, next)
      if (result) return result
    }
    return null
  }
  return search(root, [])
}

export function useTreeEditor(openingId: string): UseTreeEditorReturn | null {
  const [tree, setTree] = useState<OpeningTree | null>(() => storage.get(openingId))

  const [path, setPath] = useState<TreeNode[]>(() => {
    const t = storage.get(openingId)
    return t ? [t.root] : []
  })

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalTargets, setLegalTargets] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [flipped, setFlipped] = useState<boolean>(() => {
    const t = storage.get(openingId)
    return t?.color === 'black'
  })

  const chessRef = useRef<Chess>(new Chess())
  const treeRef = useRef(tree)
  const pathRef = useRef(path)
  treeRef.current = tree
  pathRef.current = path

  useEffect(() => {
    if (!path.length) return
    chessRef.current.load(path[path.length - 1].fen)
  }, [path])

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const persistTree = useCallback((t: OpeningTree) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => storage.save(t), 300)
  }, [])

  // -------------------------------------------------------------------
  // Core: apply a validated move from the current position
  // -------------------------------------------------------------------
  const applyMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const chess = chessRef.current
      let result
      try {
        result = chess.move({ from: from as Square, to: to as Square, promotion: promotion as any })
      } catch {
        return false
      }
      if (!result) return false

      const newFen = chess.fen()
      const currentNode = pathRef.current[pathRef.current.length - 1]

      // Look up fresh version of current node to avoid stale children
      const freshCurrent = findPathToNode(treeRef.current!.root, currentNode.id)
        ?.at(-1) ?? currentNode
      const existingChild = freshCurrent.children.find(c => c.san === result.san)

      if (existingChild) {
        const newPath = findPathToNode(treeRef.current!.root, existingChild.id)
        if (newPath) setPath(newPath)
      } else {
        const newChild: TreeNode = { id: newId(), san: result.san, fen: newFen, note: '', children: [] }
        const updatedCurrent: TreeNode = { ...freshCurrent, children: [...freshCurrent.children, newChild] }
        const newRoot = replaceNode(treeRef.current!.root, updatedCurrent)
        const updatedTree: OpeningTree = { ...treeRef.current!, root: newRoot, updatedAt: new Date().toISOString() }
        setTree(updatedTree)
        persistTree(updatedTree)
        const newPath = findPathToNode(newRoot, newChild.id)
        if (newPath) setPath(newPath)
      }

      setLastMove({ from: result.from, to: result.to })
      setSelectedSquare(null)
      setLegalTargets([])
      return true
    },
    [persistTree],
  )

  // -------------------------------------------------------------------
  // Click-to-move handler
  // -------------------------------------------------------------------
  const clickSquare = useCallback(
    (square: string) => {
      const chess = chessRef.current
      const sq = square as Square
      const piece = chess.get(sq)
      const turn = chess.turn()

      if (selectedSquare) {
        if (legalTargets.includes(square)) {
          const movePiece = chess.get(selectedSquare as Square)
          const isPromotion =
            movePiece?.type === 'p' &&
            ((turn === 'w' && square[1] === '8') || (turn === 'b' && square[1] === '1'))
          applyMove(selectedSquare, square, isPromotion ? 'q' : undefined)
        } else if (piece && piece.color === turn) {
          const targets = (chess.moves({ square: sq, verbose: true }) as any[]).map((m: any) => m.to)
          setSelectedSquare(square)
          setLegalTargets(targets)
        } else {
          setSelectedSquare(null)
          setLegalTargets([])
        }
      } else if (piece && piece.color === turn) {
        const targets = (chess.moves({ square: sq, verbose: true }) as any[]).map((m: any) => m.to)
        setSelectedSquare(square)
        setLegalTargets(targets)
      }
    },
    [selectedSquare, legalTargets, applyMove],
  )

  // -------------------------------------------------------------------
  // Drag-and-drop handler
  // -------------------------------------------------------------------
  const onPieceDrop = useCallback(
    (from: string, to: string): boolean => {
      const chess = chessRef.current
      const piece = chess.get(from as Square)
      const turn = chess.turn()
      const isPromotion =
        piece?.type === 'p' &&
        ((turn === 'w' && to[1] === '8') || (turn === 'b' && to[1] === '1'))
      return applyMove(from, to, isPromotion ? 'q' : undefined)
    },
    [applyMove],
  )

  // -------------------------------------------------------------------
  // Navigation — always re-derives path from treeRef to avoid stale nodes
  // -------------------------------------------------------------------
  const navigateToNode = useCallback((nodeId: string) => {
    if (!treeRef.current) return
    const newPath = findPathToNode(treeRef.current.root, nodeId)
    if (!newPath) return
    chessRef.current.load(newPath[newPath.length - 1].fen)
    setPath(newPath)
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
  }, [])

  const navigateBack = useCallback(() => {
    const p = pathRef.current
    if (p.length <= 1) return
    const parentId = p[p.length - 2].id
    const newPath = findPathToNode(treeRef.current!.root, parentId)
    if (!newPath) return
    chessRef.current.load(newPath[newPath.length - 1].fen)
    setPath(newPath)
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
  }, [])

  const navigateForward = useCallback(() => {
    if (!treeRef.current) return
    const currentId = pathRef.current[pathRef.current.length - 1].id
    const freshCurrent = findPathToNode(treeRef.current.root, currentId)?.at(-1)
    if (!freshCurrent || freshCurrent.children.length === 0) return
    const newPath = findPathToNode(treeRef.current.root, freshCurrent.children[0].id)
    if (!newPath) return
    chessRef.current.load(newPath[newPath.length - 1].fen)
    setPath(newPath)
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
  }, [])

  const navigateTo = useCallback((pathIndex: number) => {
    const p = pathRef.current
    if (pathIndex < 0 || pathIndex >= p.length) return
    const nodeId = p[pathIndex].id
    const newPath = findPathToNode(treeRef.current!.root, nodeId)
    if (!newPath) return
    chessRef.current.load(newPath[newPath.length - 1].fen)
    setPath(newPath)
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
  }, [])

  const resetBoard = useCallback(() => {
    if (!treeRef.current) return
    chessRef.current.load(treeRef.current.root.fen)
    setPath([treeRef.current.root])
    setSelectedSquare(null)
    setLegalTargets([])
    setLastMove(null)
  }, [])

  const flipBoard = useCallback(() => setFlipped(f => !f), [])

  // -------------------------------------------------------------------
  // Note update (debounced save)
  // -------------------------------------------------------------------
  const updateNote = useCallback(
    (note: string) => {
      const current = pathRef.current[pathRef.current.length - 1]
      const updatedNode: TreeNode = { ...current, note }
      const newRoot = replaceNode(treeRef.current!.root, updatedNode)
      const updatedTree: OpeningTree = { ...treeRef.current!, root: newRoot, updatedAt: new Date().toISOString() }
      setTree(updatedTree)
      persistTree(updatedTree)
      setPath(p => {
        const updated = [...p]
        updated[updated.length - 1] = updatedNode
        return updated
      })
    },
    [persistTree],
  )

  // -------------------------------------------------------------------
  const deleteNode = useCallback((nodeId: string) => {
    if (!treeRef.current) return

    function removeFromTree(node: TreeNode, targetId: string): TreeNode {
      return {
        ...node,
        children: node.children
          .filter(c => c.id !== targetId)
          .map(c => removeFromTree(c, targetId))
      }
    }

    const newRoot = removeFromTree(treeRef.current.root, nodeId)
    const updatedTree: OpeningTree = { ...treeRef.current, root: newRoot, updatedAt: new Date().toISOString() }
    setTree(updatedTree)
    persistTree(updatedTree)

    const currentId = pathRef.current[pathRef.current.length - 1].id
    const stillExists = findPathToNode(newRoot, currentId)
    if (!stillExists) {
      chessRef.current.load(newRoot.fen)
      setPath([newRoot])
      setSelectedSquare(null)
      setLegalTargets([])
      setLastMove(null)
    }
  }, [persistTree])

  // -------------------------------------------------------------------
  if (!tree || !path.length) return null

  const currentNode = path[path.length - 1]

  return {
    tree,
    currentNode,
    path,
    fen: currentNode.fen,
    selectedSquare,
    legalTargets,
    lastMove,
    flipped,
    clickSquare,
    onPieceDrop,
    navigateBack,
    navigateForward,
    navigateTo,
    navigateToNode,
    deleteNode,
    resetBoard,
    flipBoard,
    updateNote,
  }
}
