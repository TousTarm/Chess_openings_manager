import React, { useState, useRef } from 'react'
import { Chess } from 'chess.js'
import { storage } from '../lib/storage'
import { newId, type OpeningTree, type TreeNode } from '../types/tree'
import type { Page } from '../types'

interface HomeProps {
  navigate: (page: Page) => void
}

type Step = 'menu' | 'creating'

export function Home({ navigate }: HomeProps) {
  const [step, setStep] = useState<Step>('menu')
  const [name, setName] = useState('')
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [responseMove, setResponseMove] = useState('')
  const [responseError, setResponseError] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    let startFen = new Chess().fen()

    if (color === 'black' && responseMove.trim()) {
      try {
        const c = new Chess()
        c.move(responseMove.trim())
        startFen = c.fen()
      } catch {
        setResponseError('Invalid move')
        return
      }
    }

    const rootNode: TreeNode = { id: newId(), san: '', fen: startFen, note: '', children: [] }
    const tree: OpeningTree = {
      id: newId(),
      name: trimmed,
      color,
      root: rootNode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.save(tree)
    navigate({ type: 'editor', openingId: tree.id })
  }

  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-chess-bg flex flex-col">
        <div className="bg-chess-panel border-b border-chess-border p-4 flex items-center gap-3">
          <button onClick={() => setStep('menu')} className="text-chess-muted hover:text-chess-text transition-colors text-xl">←</button>
          <h2 className="text-chess-text font-bold text-lg">New Opening</h2>
        </div>

        <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-5">
          <div>
            <label className="block text-chess-muted text-sm mb-1">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Sicilian, King's Indian…"
              className="w-full bg-chess-panel border border-chess-border rounded-lg px-4 py-3 text-chess-text placeholder-chess-muted focus:outline-none focus:border-chess-green transition-colors"
            />
          </div>

          <div>
            <label className="block text-chess-muted text-sm mb-2">Playing as</label>
            <div className="grid grid-cols-2 gap-3">
              {(['white', 'black'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setResponseMove(''); setResponseError('') }}
                  className={`py-3 rounded-xl border-2 font-semibold transition-all ${color === c
                      ? 'border-chess-green bg-chess-green/10 text-chess-green'
                      : 'border-chess-border bg-chess-panel text-chess-muted hover:border-chess-muted'
                    }`}
                >
                  <div className="text-2xl mb-1">{c === 'white' ? '♔' : '♚'}</div>
                  <div className="capitalize text-sm">{c}</div>
                </button>
              ))}
            </div>
          </div>

          {color === 'black' && (
            <div>
              <label className="block text-chess-muted text-sm mb-1">White's first move (optional)</label>
              <input
                type="text"
                value={responseMove}
                onChange={e => { setResponseMove(e.target.value); setResponseError('') }}
                placeholder="e.g. e4, d4, Nf3…"
                className="w-full bg-chess-panel border border-chess-border rounded-lg px-4 py-2.5 text-chess-text placeholder-chess-muted focus:outline-none focus:border-chess-green transition-colors text-sm font-mono"
              />
              {responseError && <p className="text-red-400 text-xs mt-1">{responseError}</p>}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full btn-primary py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Opening
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-6xl mb-3">♔</div>
          <h1 className="text-3xl font-bold text-chess-text tracking-tight">Chess Openings</h1>
          <p className="text-chess-muted mt-1 text-sm">Build your repertoire</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => setStep('creating')}
            className="w-full bg-chess-panel border border-chess-border rounded-xl p-4 flex items-center gap-4 text-left hover:border-chess-green active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chess-green to-green-700 flex items-center justify-center text-2xl shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              +
            </div>
            <div>
              <div className="text-chess-text font-semibold text-base">New Opening</div>
              <div className="text-chess-muted text-sm">Record a new opening line</div>
            </div>
            <div className="ml-auto text-chess-muted text-xl">›</div>
          </button>

          <button
            onClick={() => navigate({ type: 'openings-list' })}
            className="w-full bg-chess-panel border border-chess-border rounded-xl p-4 flex items-center gap-4 text-left hover:border-chess-green active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              ♟
            </div>
            <div>
              <div className="text-chess-text font-semibold text-base">My Openings</div>
              <div className="text-chess-muted text-sm">Browse and edit your repertoire</div>
            </div>
            <div className="ml-auto text-chess-muted text-xl">›</div>
          </button>

          <button
            onClick={() => navigate({ type: 'browse-eco' })}
            className="w-full bg-chess-panel border border-chess-border rounded-xl p-4 flex items-center gap-4 text-left hover:border-chess-green active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              ♜
            </div>
            <div>
              <div className="text-chess-text font-semibold text-base">Opening Library</div>
              <div className="text-chess-muted text-sm">Browse 3,000+ named openings</div>
            </div>
            <div className="ml-auto text-chess-muted text-xl">›</div>
          </button>
        </div>
      </div>
    </div>
  )
}
