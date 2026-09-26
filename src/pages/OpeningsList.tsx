import React, { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { storage } from '../lib/storage'
import { forksFromMainline, mainlineSans, maxDepth, type OpeningTree } from '../types/tree'
import { positionFen } from '../lib/eco'
import type { Page } from '../types'

interface OpeningsListProps {
  navigate: (page: Page) => void
}

/** Reconstruct SANs from the starting position to a target FEN (short BFS). */
function sansFromStartToFen(targetFen: string): string[] {
  const target = positionFen(targetFen)
  const start = new Chess()
  if (positionFen(start.fen()) === target) return []

  type Item = { fen: string; sans: string[] }
  const queue: Item[] = [{ fen: start.fen(), sans: [] }]
  const seen = new Set([positionFen(start.fen())])

  while (queue.length) {
    const { fen, sans } = queue.shift()!
    if (sans.length >= 4) continue
    const chess = new Chess(fen)
    for (const m of chess.moves({ verbose: true })) {
      const next = new Chess(fen)
      next.move(m)
      const key = positionFen(next.fen())
      if (seen.has(key)) continue
      const path = [...sans, m.san]
      if (key === target) return path
      seen.add(key)
      queue.push({ fen: next.fen(), sans: path })
    }
  }
  return []
}

/** First move(s) shown on the card: 1 for white, up to 2 for black. */
function openingPreview(tree: OpeningTree): string {
  const baked = sansFromStartToFen(tree.root.fen)
  const needed = tree.color === 'white' ? 1 : 2
  const fromTree = mainlineSans(tree.root, needed - baked.length)
  const moves = [...baked, ...fromTree].slice(0, needed)
  return moves.length ? moves.join(' ') : '—'
}

export function OpeningsList({ navigate }: OpeningsListProps) {
  const [openings, setOpenings] = useState(() => storage.list())
  const [colorFilter, setColorFilter] = useState<'white' | 'black'>('white')

  const filtered = useMemo(
    () => openings.filter(o => o.root && o.color === colorFilter),
    [openings, colorFilter],
  )

  const counts = useMemo(() => ({
    white: openings.filter(o => o.root && o.color === 'white').length,
    black: openings.filter(o => o.root && o.color === 'black').length,
  }), [openings])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    storage.delete(id)
    setOpenings(storage.list())
  }

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col">
      <div className="bg-chess-panel border-b border-chess-border p-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ type: 'home' })}
          className="text-chess-muted hover:text-chess-text transition-colors text-xl"
        >
          ←
        </button>
        <h2 className="text-chess-text font-bold text-lg">My Openings</h2>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* Color filter */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['white', 'black'] as const).map(c => (
            <button
              key={c}
              onClick={() => setColorFilter(c)}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                colorFilter === c
                  ? 'border-chess-green bg-chess-green/10 text-chess-green'
                  : 'border-chess-border bg-chess-panel text-chess-muted hover:border-chess-muted'
              }`}
            >
              {c}
              <span className="ml-1.5 font-mono text-xs opacity-70">{counts[c]}</span>
            </button>
          ))}
        </div>

        {openings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-chess-muted">No openings yet.</p>
            <button
              onClick={() => navigate({ type: 'home' })}
              className="mt-4 btn-primary"
            >
              Create your first opening
            </button>
          </div>
        )}

        {openings.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-chess-muted text-sm">
              No {colorFilter} openings yet.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {filtered.map(o => {
            const depth = maxDepth(o.root)
            const forks = forksFromMainline(o.root)
            const preview = openingPreview(o)

            return (
              <button
                key={o.id}
                onClick={() => navigate({ type: 'editor', openingId: o.id })}
                className="bg-chess-panel border border-chess-border rounded-xl p-4 text-left hover:border-chess-green transition-colors w-full group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-chess-text font-semibold truncate">{o.name}</div>
                    <div className="font-mono text-chess-green text-sm mt-1">{preview}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-chess-muted text-xs mt-1.5">
                      <span>depth {depth}</span>
                      <span>
                        {forks} fork{forks !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => handleDelete(o.id, e)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1 opacity-0 group-hover:opacity-100 text-lg"
                      title="Delete opening"
                    >
                      ×
                    </button>
                    <span className="text-chess-muted text-xl">›</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
