import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard, type Arrow } from '../components/ChessBoard'
import { loadEco, getAllEntries, getPopular, isLoaded, lookupByFen, type EcoEntry } from '../lib/eco'
import { sanToArrow } from '../lib/arrows'
import { storage } from '../lib/storage'
import { newId, type OpeningTree, type TreeNode } from '../types/tree'
import type { Page } from '../types'

interface EcoBrowserProps {
  navigate: (page: Page) => void
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface OpeningFamily {
  name: string        // base name before ':'
  entries: EcoEntry[] // all variations in this family
}

interface EcoNode {
  san: string
  fen: string
  from: string | null
  to: string | null
  children: EcoNode[]
  labels: string[]    // ECO codes of entries ending here
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function pgnToSans(pgn: string): string[] {
  return pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean)
}

function getFamilyName(name: string): string {
  return name.split(':')[0].trim()
}

function groupByFamily(entries: EcoEntry[]): OpeningFamily[] {
  const map = new Map<string, EcoEntry[]>()
  for (const e of entries) {
    const family = getFamilyName(e.name)
    if (!map.has(family)) map.set(family, [])
    map.get(family)!.push(e)
  }
  return Array.from(map.entries()).map(([name, entries]) => ({ name, entries }))
}

function buildTree(entries: EcoEntry[]): EcoNode {
  const root: EcoNode = {
    san: '', fen: new Chess().fen(), from: null, to: null, children: [], labels: [],
  }
  for (const entry of entries) {
    let node = root
    const chess = new Chess()
    for (const san of pgnToSans(entry.pgn)) {
      try {
        const move = chess.move(san)
        let child = node.children.find(c => c.san === move.san)
        if (!child) {
          child = { san: move.san, fen: chess.fen(), from: move.from, to: move.to, children: [], labels: [] }
          node.children.push(child)
        }
        node = child
      } catch { break }
    }
    if (!node.labels.includes(entry.eco)) node.labels.push(entry.eco)
  }
  return root
}

function ecoNodeToTreeNode(node: EcoNode): TreeNode {
  return {
    id: newId(),
    san: node.san,
    fen: node.fen,
    note: node.labels.join(', '),
    children: node.children.map(ecoNodeToTreeNode),
  }
}

function familyToOpeningTree(root: EcoNode, name: string, color: 'white' | 'black'): OpeningTree {
  return {
    id: newId(), name, color,
    root: ecoNodeToTreeNode(root),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

// ── FamilyRow ──────────────────────────────────────────────────────────────────

function FamilyRow({ family, onClick }: { family: OpeningFamily; onClick: () => void }) {
  const shortPgn = family.entries.reduce((a, b) =>
    pgnToSans(a.pgn).length <= pgnToSans(b.pgn).length ? a : b
  ).pgn
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 border-b border-chess-border/50 text-left hover:bg-chess-panel transition-colors flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="text-chess-text text-sm">{family.name}</div>
        <div className="text-chess-muted text-xs font-mono truncate mt-0.5">{shortPgn}</div>
      </div>
      {family.entries.length > 1 && (
        <span className="text-chess-green text-xs font-mono bg-chess-green/10 px-1.5 py-0.5 rounded shrink-0">
          {family.entries.length}
        </span>
      )}
      <span className="text-chess-muted text-lg shrink-0">›</span>
    </button>
  )
}

// ── OpeningPreview ─────────────────────────────────────────────────────────────

function OpeningPreview({
  family,
  onBack,
  onImport,
}: {
  family: OpeningFamily
  onBack: () => void
  onImport: (root: EcoNode) => void
}) {
  const root = useMemo(() => buildTree(family.entries), [family.entries])
  const [path, setPath] = useState<EcoNode[]>([root])
  const [flipped, setFlipped] = useState(false)

  useEffect(() => { setPath([root]) }, [root])

  const cur = path[path.length - 1]
  const canBack = path.length > 1
  const canForward = cur.children.length > 0

  const lastMove = cur.from ? { from: cur.from, to: cur.to! } : null

  const childArrows = useMemo((): Arrow[] =>
    cur.children
      .map(child => sanToArrow(cur.fen, child.san, 'blue'))
      .filter((a): a is Arrow => a !== null),
    [cur] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const navigateTo = useCallback((child: EcoNode) => {
    setPath(p => [...p, child])
  }, [])

  const goBack = useCallback(() => {
    setPath(p => p.length > 1 ? p.slice(0, -1) : p)
  }, [])

  const goForward = useCallback(() => {
    if (cur.children.length > 0) setPath(p => [...p, cur.children[0]])
  }, [cur])

  const goStart = useCallback(() => setPath([root]), [root])

  const goEnd = useCallback(() => {
    setPath(p => {
      let node = p[p.length - 1]
      const newPath = [...p]
      while (node.children.length > 0) {
        node = node.children[0]
        newPath.push(node)
      }
      return newPath
    })
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goForward()
      else if (e.key === 'ArrowLeft') goBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goBack, goForward])

  const breadcrumb = path.slice(1)

  // ECO label for current position
  const ecoLabel = cur.labels.length > 0
    ? cur.labels.join(' / ')
    : (lookupByFen(cur.fen)?.eco ?? null)

  return (
    <div className="h-screen bg-chess-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-chess-panel border-b border-chess-border shrink-0">
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <button onClick={onBack} className="text-chess-muted hover:text-chess-text transition-colors text-xl leading-none px-1">←</button>
          <div className="flex-1 min-w-0">
            <div className="text-chess-text font-bold truncate text-sm">{family.name}</div>
            {ecoLabel ? (
              <div className="text-chess-green font-mono text-xs">{ecoLabel}</div>
            ) : (
              <div className="text-chess-muted text-xs">{family.entries.length} variation{family.entries.length !== 1 ? 's' : ''}</div>
            )}
          </div>
          <button
            onClick={() => setFlipped(f => !f)}
            className="btn-secondary px-3 py-1.5 text-sm shrink-0"
          >
            Flip
          </button>
          <button
            onClick={() => onImport(root)}
            className="btn-primary px-3 py-1.5 text-sm shrink-0"
          >
            Import
          </button>
        </div>

        {/* Breadcrumb */}
        <div
          className="px-3 py-1.5 flex gap-0.5 overflow-x-auto items-center min-h-[34px]"
          style={{ scrollbarWidth: 'none' }}
        >
          {breadcrumb.length === 0 ? (
            <span className="text-chess-muted text-xs italic">Start position</span>
          ) : (
            breadcrumb.map((node, i) => {
              const isWhiteMove = i % 2 === 0
              const moveNum = Math.floor(i / 2) + 1
              const isLast = i === breadcrumb.length - 1
              const pathIdx = i + 1
              return (
                <React.Fragment key={i}>
                  {isWhiteMove && (
                    <span className="text-chess-muted text-xs shrink-0 ml-1 mr-0.5 select-none">{moveNum}.</span>
                  )}
                  <button
                    onClick={() => setPath(path.slice(0, pathIdx + 1))}
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
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div className="w-full" style={{ maxWidth: 'min(100%, calc(100svh - 260px), 480px)' }}>
          <ChessBoard
            fen={cur.fen}
            selectedSquare={null}
            legalTargets={[]}
            lastMove={lastMove}
            onSquareClick={() => {}}
            interactive={false}
            flipped={flipped}
            arrows={childArrows}
          />
        </div>
      </div>

      {/* Variation buttons — shown when there are children */}
      {cur.children.length > 0 && (
        <div
          className="bg-chess-bg border-t border-chess-border px-3 py-1.5 shrink-0 flex gap-1.5 overflow-x-auto items-center"
          style={{ scrollbarWidth: 'none' }}
        >
          {cur.children.map((child, idx) => (
            <button
              key={idx}
              onClick={() => navigateTo(child)}
              className={`flex-1 text-xs font-mono py-1.5 px-3 rounded border transition-colors ${
                idx === 0
                  ? 'border-chess-green text-chess-green hover:bg-chess-green/10'
                  : 'border-chess-border text-chess-muted hover:bg-chess-border/30 hover:text-chess-text'
              }`}
            >
              {child.san}
              {child.labels.length > 0 && (
                <span className="ml-1 opacity-60 text-[10px]">{child.labels[0]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Nav buttons */}
      <div
        className="bg-chess-panel border-t border-chess-border shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 gap-2 p-3">
          <button onClick={goStart} disabled={!canBack}
            className="btn-secondary py-4 text-sm disabled:opacity-30 disabled:cursor-not-allowed">⟨⟨</button>
          <button onClick={goBack} disabled={!canBack}
            className="btn-secondary py-4 text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
          <button onClick={goForward} disabled={!canForward}
            className="btn-secondary py-4 text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          <button onClick={goEnd} disabled={!canForward}
            className="btn-secondary py-4 text-sm disabled:opacity-30 disabled:cursor-not-allowed">⟩⟩</button>
        </div>
      </div>
    </div>
  )
}

// ── ImportDialog ───────────────────────────────────────────────────────────────

function ImportDialog({
  family,
  root,
  onBack,
  onDone,
}: {
  family: OpeningFamily
  root: EcoNode
  onBack: () => void
  onDone: (openingId: string) => void
}) {
  const [importName, setImportName] = useState(family.name)
  const [importColor, setImportColor] = useState<'white' | 'black'>('white')

  const handleImport = useCallback(() => {
    if (!importName.trim()) return
    const tree = familyToOpeningTree(root, importName.trim(), importColor)
    storage.save(tree)
    onDone(tree.id)
  }, [root, importName, importColor, onDone])

  return (
    <div className="min-h-screen bg-chess-bg flex flex-col">
      <div className="bg-chess-panel border-b border-chess-border p-4 flex items-center gap-3">
        <button onClick={onBack} className="text-chess-muted hover:text-chess-text transition-colors text-xl">←</button>
        <h2 className="text-chess-text font-bold text-lg">Import Opening</h2>
      </div>
      <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-5">
        <div className="bg-chess-panel border border-chess-border rounded-xl p-4">
          <div className="text-chess-text font-semibold">{family.name}</div>
          <div className="text-chess-muted text-xs mt-1">
            {family.entries.length} variation{family.entries.length !== 1 ? 's' : ''} will be imported as one opening
          </div>
        </div>
        <div>
          <label className="block text-chess-muted text-sm mb-1">Name in your repertoire</label>
          <input
            autoFocus type="text" value={importName}
            onChange={e => setImportName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleImport()}
            placeholder={family.name}
            className="w-full bg-chess-panel border border-chess-border rounded-lg px-4 py-3 text-chess-text placeholder-chess-muted focus:outline-none focus:border-chess-green transition-colors"
          />
        </div>
        <div>
          <label className="block text-chess-muted text-sm mb-2">I play as</label>
          <div className="grid grid-cols-2 gap-3">
            {(['white', 'black'] as const).map(c => (
              <button key={c} onClick={() => setImportColor(c)}
                className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                  importColor === c
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
        <button
          onClick={handleImport} disabled={!importName.trim()}
          className="w-full btn-primary py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Import & Open Editor
        </button>
      </div>
    </div>
  )
}

// ── Main EcoBrowser ────────────────────────────────────────────────────────────

export function EcoBrowser({ navigate }: EcoBrowserProps) {
  const [loaded, setLoaded] = useState(isLoaded())
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [allFamilies, setAllFamilies] = useState<OpeningFamily[]>([])
  const [selectedFamily, setSelectedFamily] = useState<OpeningFamily | null>(null)
  const [importRoot, setImportRoot] = useState<EcoNode | null>(null)

  const popularFamilies = useMemo(() => groupByFamily(getPopular()), [])

  useEffect(() => {
    if (isLoaded()) {
      setLoaded(true)
      setAllFamilies(groupByFamily(getAllEntries()))
      return
    }
    loadEco()
      .then(() => {
        setLoaded(true)
        setAllFamilies(groupByFamily(getAllEntries()))
      })
      .catch(() => setLoadError(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const displayFamilies = useMemo((): OpeningFamily[] => {
    // Fall back to popular if full DB hasn't loaded or returned no entries
    const source = loaded && allFamilies.length > 0 ? allFamilies : popularFamilies
    if (!query.trim()) return source
    const q = query.toLowerCase()
    return source.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.entries.some(e => e.name.toLowerCase().includes(q))
    )
  }, [query, loaded, allFamilies, popularFamilies])

  // When importing, get family entries from full DB if loaded
  const getFullFamily = useCallback((family: OpeningFamily): OpeningFamily => {
    if (!loaded) return family
    const fullEntries = getAllEntries().filter(e => getFamilyName(e.name) === family.name)
    return fullEntries.length > 0 ? { name: family.name, entries: fullEntries } : family
  }, [loaded])

  if (importRoot && selectedFamily) {
    return (
      <ImportDialog
        family={selectedFamily}
        root={importRoot}
        onBack={() => setImportRoot(null)}
        onDone={openingId => navigate({ type: 'editor', openingId })}
      />
    )
  }

  if (selectedFamily) {
    return (
      <OpeningPreview
        family={selectedFamily}
        onBack={() => setSelectedFamily(null)}
        onImport={root => setImportRoot(root)}
      />
    )
  }

  // ── Search / list view ───────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-chess-bg flex flex-col overflow-hidden">
      <div className="bg-chess-panel border-b border-chess-border shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <button onClick={() => navigate({ type: 'home' })} className="text-chess-muted hover:text-chess-text transition-colors text-xl">←</button>
          <h2 className="text-chess-text font-bold text-lg flex-1">Opening Library</h2>
          {!loaded && !loadError && (
            <span className="text-chess-muted text-xs animate-pulse">Loading…</span>
          )}
        </div>
        <div className="px-4 pb-3">
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search openings…"
            className="w-full bg-chess-bg border border-chess-border rounded-lg px-4 py-2.5 text-chess-text placeholder-chess-muted focus:outline-none focus:border-chess-green transition-colors text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadError && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2 opacity-30">⚠</div>
            <p className="text-chess-muted text-sm">Could not load full opening database.</p>
            <p className="text-chess-muted text-xs mt-1">Showing popular openings below.</p>
          </div>
        )}

        <div className="px-4 py-2 bg-chess-panel/50 border-b border-chess-border/50">
          <span className="text-chess-muted text-xs font-semibold uppercase tracking-wider">
            {loaded
              ? query
                ? `${displayFamilies.length} result${displayFamilies.length !== 1 ? 's' : ''}`
                : `All Openings (${allFamilies.length} families)`
              : query
                ? 'Popular matches'
                : 'Popular Openings — full database loading…'}
          </span>
        </div>

        {displayFamilies.map((family, idx) => (
          <FamilyRow
            key={idx}
            family={family}
            onClick={() => setSelectedFamily(getFullFamily(family))}
          />
        ))}

        {displayFamilies.length === 0 && query && (
          <div className="text-center py-16">
            <p className="text-chess-muted text-sm">No openings found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
