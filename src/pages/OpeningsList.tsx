import React, { useState } from 'react'
import { storage } from '../lib/storage'
import type { Page } from '../types'

interface OpeningsListProps {
  navigate: (page: Page) => void
}

export function OpeningsList({ navigate }: OpeningsListProps) {
  const [openings, setOpenings] = useState(() => storage.list())

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
        {openings.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-20">♟</div>
            <p className="text-chess-muted">No openings yet.</p>
            <button
              onClick={() => navigate({ type: 'home' })}
              className="mt-4 btn-primary"
            >
              Create your first opening
            </button>
          </div>
        )}

        <div className="grid gap-3">
          {openings.filter(o => o.root).map(o => {
            // Count total nodes (BFS)
            let nodeCount = 0
            const queue = [o.root]
            while (queue.length) {
              const n = queue.shift()!
              nodeCount++
              if (n.children) queue.push(...n.children)
            }

            return (
              <button
                key={o.id}
                onClick={() => navigate({ type: 'editor', openingId: o.id })}
                className="bg-chess-panel border border-chess-border rounded-xl p-4 text-left hover:border-chess-green transition-colors w-full group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${o.color === 'white'
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-gray-700 text-gray-200'
                          }`}
                      >
                        {o.color}
                      </span>
                    </div>
                    <div className="text-chess-text font-semibold truncate">{o.name}</div>
                    <div className="text-chess-muted text-sm mt-0.5">
                      {nodeCount - 1} position{nodeCount - 1 !== 1 ? 's' : ''}
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
