import { Chess } from 'chess.js'
import type { Arrow } from '../components/ChessBoard'

/** Parse a SAN move at a given FEN and return the from/to squares. */
export function sanToArrow(
  fen: string,
  san: string,
  color: Arrow['color'],
): Arrow | null {
  try {
    const c = new Chess(fen)
    const m = c.move(san)
    return m ? { from: m.from, to: m.to, color } : null
  } catch {
    return null
  }
}
