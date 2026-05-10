import { Chess } from 'chess.js'

export interface EcoEntry {
  eco: string
  name: string
  pgn: string
  uci: string
  fen: string   // position-only FEN (4 fields, no move counters)
}

/** Reduce full FEN to first 4 fields (position, turn, castling, en-passant) */
export function positionFen(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

function fenFromPgn(pgn: string): string {
  const chess = new Chess()
  for (const san of pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean)) {
    try { chess.move(san) } catch { break }
  }
  return positionFen(chess.fen())
}

// Hardcoded popular openings — always available, no network needed
const POPULAR_STUBS: Array<{ eco: string; name: string; pgn: string }> = [
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6' },
  { eco: 'B85', name: 'Sicilian Defense: Scheveningen Variation', pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e6' },
  { eco: 'B30', name: 'Sicilian Defense: Old Sicilian', pgn: '1. e4 c5 2. Nf3 Nc6' },
  { eco: 'C00', name: 'French Defense', pgn: '1. e4 e6' },
  { eco: 'C11', name: 'French Defense: Classical Variation', pgn: '1. e4 e6 2. d4 d5 3. Nc3 Nf6' },
  { eco: 'C10', name: 'French Defense: Rubinstein Variation', pgn: '1. e4 e6 2. d4 d5 3. Nc3 dxe4' },
  { eco: 'B10', name: 'Caro-Kann Defense', pgn: '1. e4 c6' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', pgn: '1. e4 c6 2. d4 d5 3. e5' },
  { eco: 'B01', name: 'Scandinavian Defense', pgn: '1. e4 d5' },
  { eco: 'C60', name: 'Ruy Lopez', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6' },
  { eco: 'C54', name: 'Italian Game: Classical Variation', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5' },
  { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
  { eco: 'C45', name: 'Scotch Game: Classical Variation', pgn: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4' },
  { eco: 'C44', name: 'Scotch Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. d4' },
  { eco: 'C41', name: 'Philidor Defense', pgn: '1. e4 e5 2. Nf3 d6' },
  { eco: 'B07', name: 'Pirc Defense', pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6' },
  { eco: 'B06', name: 'Modern Defense', pgn: '1. e4 g6' },
  { eco: 'D06', name: "Queen's Gambit", pgn: '1. d4 d5 2. c4' },
  { eco: 'D30', name: "Queen's Gambit Declined", pgn: '1. d4 d5 2. c4 e6' },
  { eco: 'D10', name: 'Slav Defense', pgn: '1. d4 d5 2. c4 c6' },
  { eco: 'E00', name: 'Catalan Opening', pgn: '1. d4 Nf6 2. c4 e6 3. g3' },
  { eco: 'E60', name: "King's Indian Defense", pgn: '1. d4 Nf6 2. c4 g6' },
  { eco: 'E62', name: "King's Indian Defense: Fianchetto Variation", pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. Nf3 d6 5. g3' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', pgn: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4' },
  { eco: 'A30', name: 'English Opening: Symmetrical Variation', pgn: '1. c4 c5' },
  { eco: 'A15', name: 'English Opening: Anglo-Indian Defense', pgn: '1. c4 Nf6' },
  { eco: 'A10', name: 'English Opening', pgn: '1. c4' },
  { eco: 'A80', name: 'Dutch Defense', pgn: '1. d4 f5' },
  { eco: 'D85', name: 'Grünfeld Defense', pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3 Bg7' },
  { eco: 'A07', name: "King's Indian Attack", pgn: '1. Nf3 d5 2. g3' },
  { eco: 'A45', name: "Queen's Pawn Game: Indian Defense", pgn: '1. d4 Nf6' },
  { eco: 'D00', name: "Queen's Pawn Game", pgn: '1. d4 d5' },
]

let _popular: EcoEntry[] | null = null

export function getPopular(): EcoEntry[] {
  if (_popular) return _popular
  _popular = POPULAR_STUBS.map(s => ({
    eco: s.eco,
    name: s.name,
    pgn: s.pgn,
    uci: '',
    fen: fenFromPgn(s.pgn),
  }))
  return _popular
}

let _entries: EcoEntry[] | null = null
let _fenMap: Map<string, EcoEntry> | null = null
let _loadPromise: Promise<void> | null = null

async function fetchTsv(letter: string): Promise<EcoEntry[]> {
  const urls = [
    `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${letter}.tsv`,
    `https://raw.githubusercontent.com/lichess-org/chess-openings/main/${letter}.tsv`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const text = await res.text()
      const entries = text.trim().split('\n').slice(1).map(line => {
        const [eco, name, pgn, uci, fen] = line.split('\t')
        return { eco, name, pgn: pgn ?? '', uci: uci ?? '', fen: fen ?? '' }
      }).filter(e => e.eco && e.name && e.fen)
      if (entries.length > 0) return entries
    } catch { /* try next */ }
  }
  return []
}

export async function loadEco(): Promise<void> {
  if (_entries && _entries.length > 0) return
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    const results = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(fetchTsv))
    const fetched = results.flat()
    if (fetched.length > 0) {
      _entries = fetched
    } else {
      // Network returned nothing — keep _entries null so retries are possible
      _loadPromise = null
    }
    _fenMap = new Map((_entries ?? []).map(e => [e.fen, e]))
    for (const e of getPopular()) {
      if (!_fenMap.has(e.fen)) _fenMap.set(e.fen, e)
    }
  })()
  return _loadPromise
}

export function lookupByFen(fullFen: string): EcoEntry | null {
  const key = positionFen(fullFen)
  if (_fenMap) return _fenMap.get(key) ?? null
  return getPopular().find(e => e.fen === key) ?? null
}

export function searchByName(query: string, limit = 100): EcoEntry[] {
  const source = _entries ?? []
  const q = query.toLowerCase().trim()
  if (!q) return source.slice(0, limit)
  return source.filter(e => e.name.toLowerCase().includes(q)).slice(0, limit)
}

export function getAllEntries(): EcoEntry[] {
  return _entries ?? []
}

export function isLoaded(): boolean {
  return _entries !== null && _entries.length > 0
}
