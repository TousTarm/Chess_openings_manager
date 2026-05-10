import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard, type Arrow } from '../components/ChessBoard'
import { useTreeEditor } from '../hooks/useTreeEditor'
import { sanToArrow } from '../lib/arrows'
import type { Page } from '../types'
import type { TreeNode } from '../types/tree'
import { loadEco, lookupByFen } from '../lib/eco'

interface TreeEditorProps {
  openingId: string
  navigate: (page: Page) => void
}

interface TreePanelProps {
  root: TreeNode
  currentNodeId: string
  onNavigate: (nodeId: string) => void
  onDelete: (nodeId: string) => void
}

function TreeNode_Row({
  node,
  depth,
  currentNodeId,
  onNavigate,
  onDelete,
  isLast,
}: {
  node: TreeNode
  depth: number
  currentNodeId: string
  onNavigate: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  isLast: boolean
}) {
  const isRoot = node.san === ''
  const isActive = node.id === currentNodeId
  const label = isRoot ? 'Start' : node.san

  return (
    <div>
      <div
        className={`flex items-center group transition-colors ${
          isActive ? 'bg-chess-green/15' : 'hover:bg-chess-border/30'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {depth > 0 && (
          <span className="text-chess-border text-xs mr-1 select-none font-mono">
            {isLast ? '└' : '├'}
          </span>
        )}
        <button
          onClick={() => onNavigate(node.id)}
          className={`flex-1 text-left py-1 pr-2 text-sm font-mono truncate ${
            isActive
              ? 'text-chess-green font-bold'
              : 'text-chess-text'
          }`}
        >
          {label}
          {node.note && (
            <span className="ml-2 text-chess-muted text-xs font-sans italic">
              {node.note.slice(0, 30)}{node.note.length > 30 ? '…' : ''}
            </span>
          )}
        </button>
        {!isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.id)
            }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all px-2 py-1 text-sm leading-none shrink-0"
            title="Delete this move and all continuations"
          >
            ×
          </button>
        )}
      </div>
      {node.children.map((child, idx) => (
        <TreeNode_Row
          key={child.id}
          node={child}
          depth={depth + 1}
          currentNodeId={currentNodeId}
          onNavigate={onNavigate}
          onDelete={onDelete}
          isLast={idx === node.children.length - 1}
        />
      ))}
    </div>
  )
}

function TreePanel({ root, currentNodeId, onNavigate, onDelete }: TreePanelProps) {
  return (
    <div
      className="overflow-y-auto bg-chess-bg border-t border-chess-border shrink-0"
      style={{ maxHeight: '28vh', scrollbarWidth: 'thin' }}
    >
      <TreeNode_Row
        node={root}
        depth={0}
        currentNodeId={currentNodeId}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isLast={true}
      />
    </div>
  )
}

/** Derive move number label for a breadcrumb entry.
 *  pathMoveIndex: 1-based index among moves in path (root excluded).
 *  rootFen: the FEN of the root node to detect starting color.
 */
function moveLabel(pathMoveIndex: number, rootFen: string): { number: number; isBlack: boolean } {
  // Determine the color of the first move from root
  const rootChess = new Chess(rootFen)
  const firstMoveIsBlack = rootChess.turn() === 'b'

  if (firstMoveIsBlack) {
    // e.g. black opened: index 1 → "1…Nf6", index 2 → "2.e4"
    const number = Math.ceil(pathMoveIndex / 2)
    const isBlack = pathMoveIndex % 2 === 1
    return { number, isBlack }
  } else {
    // Normal: index 1 → "1.e4", index 2 → "1…e5"
    const number = Math.ceil(pathMoveIndex / 2)
    const isBlack = pathMoveIndex % 2 === 0
    return { number, isBlack }
  }
}

export function TreeEditor({ openingId, navigate }: TreeEditorProps) {
  const editor = useTreeEditor(openingId)
  const [ecoMatch, setEcoMatch] = useState<{ eco: string; name: string } | null>(null)

  useEffect(() => {
    loadEco().catch(() => {}) // silent fail if offline
  }, [])

  useEffect(() => {
    if (!editor) return
    const match = lookupByFen(editor.fen)
    setEcoMatch(match ? { eco: match.eco, name: match.name } : null)
  }, [editor?.fen]) // eslint-disable-line react-hooks/exhaustive-deps

  const noteRef = useRef<HTMLTextAreaElement>(null)
  const breadcrumbRef = useRef<HTMLDivElement>(null)

  // Sync textarea when navigating to a different node
  const currentNote = editor?.currentNode.note ?? ''
  useEffect(() => {
    if (noteRef.current && noteRef.current.value !== currentNote) {
      noteRef.current.value = currentNote
    }
  }, [editor?.currentNode.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll breadcrumb to the right when path grows
  useEffect(() => {
    if (breadcrumbRef.current) {
      breadcrumbRef.current.scrollLeft = breadcrumbRef.current.scrollWidth
    }
  }, [editor?.path.length])

  const childArrows = useMemo((): Arrow[] => {
    if (!editor) return []
    return editor.currentNode.children
      .map(child => sanToArrow(editor.fen, child.san, 'blue'))
      .filter((a): a is Arrow => a !== null)
  }, [editor?.currentNode.id, editor?.fen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) {
    return (
      <div className="min-h-screen bg-chess-bg flex items-center justify-center">
        <div className="text-chess-muted">Opening not found.</div>
      </div>
    )
  }

  const { tree, path, fen, selectedSquare, legalTargets, lastMove, flipped } = editor

  // Breadcrumb = path without root (root has san='')
  const breadcrumb = path.slice(1)
  const canGoBack = path.length > 1
  const canGoForward = editor.currentNode.children.length > 0
  const rootFen = tree.root.fen

  return (
    <div className="h-screen bg-chess-bg flex flex-col overflow-hidden">

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div
        className="bg-chess-panel border-b border-chess-border shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Title row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <button
            onClick={() => navigate({ type: 'openings-list' })}
            className="text-chess-muted hover:text-chess-text transition-colors text-xl leading-none px-1"
            aria-label="Back"
          >
            &#8592;
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-chess-text font-bold truncate text-sm">{tree.name}</div>
            {ecoMatch ? (
              <div className="text-xs truncate">
                <span className="font-mono text-chess-green mr-1">{ecoMatch.eco}</span>
                <span className="text-chess-muted">{ecoMatch.name}</span>
              </div>
            ) : (
              <div className="text-chess-muted text-xs capitalize">{tree.color}</div>
            )}
          </div>
        </div>

        {/* Note textarea */}
        <div className="px-3 pb-2">
          <textarea
            ref={noteRef}
            key={editor.currentNode.id}
            defaultValue={currentNote}
            onChange={e => editor.updateNote(e.target.value)}
            placeholder="Note for this position…"
            rows={2}
            className="w-full bg-chess-bg border border-chess-border rounded-lg px-3 py-2 text-chess-text placeholder-chess-muted focus:outline-none focus:border-chess-green transition-colors text-sm resize-none"
          />
        </div>
      </div>

      {/* ── BREADCRUMB ───────────────────────────────────────────────── */}
      <div
        ref={breadcrumbRef}
        className="bg-chess-bg border-b border-chess-border px-3 py-1.5 flex gap-0.5 overflow-x-auto shrink-0 items-center min-h-[34px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {breadcrumb.length === 0 ? (
          <span className="text-chess-muted text-xs italic">Start position</span>
        ) : (
          breadcrumb.map((node, i) => {
            const { number, isBlack } = moveLabel(i + 1, rootFen)
            const showNumber = !isBlack || i === 0
            const isLast = i === breadcrumb.length - 1
            // path index = i + 1 (breadcrumb skips root at index 0)
            const pathIndex = i + 1

            return (
              <React.Fragment key={node.id}>
                {showNumber && (
                  <span className="text-chess-muted text-xs shrink-0 ml-1 mr-0.5 select-none">
                    {number}{isBlack ? '…' : '.'}
                  </span>
                )}
                <button
                  onClick={() => editor.navigateTo(pathIndex)}
                  className={`font-mono text-xs whitespace-nowrap px-1.5 py-0.5 rounded transition-colors ${
                    isLast
                      ? 'bg-chess-border text-chess-text font-bold'
                      : 'text-chess-muted hover:text-chess-text hover:bg-chess-border/50'
                  }`}
                >
                  {node.san}
                </button>
              </React.Fragment>
            )
          })
        )}
      </div>

      {/* ── BOARD ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div
          className="w-full"
          style={{ maxWidth: 'min(100%, calc(100svh - 290px), 560px)' }}
        >
          <ChessBoard
            fen={fen}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={lastMove}
            onSquareClick={editor.clickSquare}
            onPieceDrop={editor.onPieceDrop}
            flipped={flipped}
            arrows={childArrows}
          />
        </div>
      </div>

      {/* ── NEXT MOVE BUTTONS ────────────────────────────────────────── */}
      {editor.currentNode.children.length > 0 && (
        <div
          className="bg-chess-bg border-t border-chess-border px-3 py-1.5 shrink-0 flex gap-1.5 overflow-x-auto items-center"
          style={{ scrollbarWidth: 'none' }}
        >
          {editor.currentNode.children.map((child, idx) => (
            <div
              key={child.id}
              className={`flex-1 flex items-stretch rounded border overflow-hidden group ${
                idx === 0 ? 'border-chess-green' : 'border-chess-border'
              }`}
            >
              <button
                onClick={() => editor.navigateToNode(child.id)}
                className={`flex-1 text-xs font-mono py-1.5 px-3 transition-colors ${
                  idx === 0
                    ? 'text-chess-green hover:bg-chess-green/10'
                    : 'text-chess-muted hover:bg-chess-border/30 hover:text-chess-text'
                }`}
              >
                {child.san}
              </button>
              <button
                onClick={() => editor.deleteNode(child.id)}
                className="opacity-0 group-hover:opacity-100 px-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all text-sm border-l border-inherit"
                title="Delete this move"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── TREE PANEL ───────────────────────────────────────────────── */}
      <TreePanel
        root={tree.root}
        currentNodeId={editor.currentNode.id}
        onNavigate={editor.navigateToNode}
        onDelete={editor.deleteNode}
      />

      {/* ── BOTTOM BAR ───────────────────────────────────────────────── */}
      <div
        className="bg-chess-panel border-t border-chess-border shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 gap-2 p-3">
          <button
            onClick={editor.navigateBack}
            disabled={!canGoBack}
            className="btn-secondary py-4 text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Back one move"
          >
            &#8249;
          </button>
          <button
            onClick={editor.navigateForward}
            disabled={!canGoForward}
            className="btn-secondary py-4 text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Forward (mainline)"
          >
            &#8250;
          </button>
          <button
            onClick={editor.resetBoard}
            className="btn-secondary py-4 text-sm"
            aria-label="Reset to start"
          >
            Reset
          </button>
          <button
            onClick={editor.flipBoard}
            className="btn-secondary py-4 text-sm"
            aria-label="Flip board"
          >
            Flip
          </button>
        </div>
      </div>
    </div>
  )
}
