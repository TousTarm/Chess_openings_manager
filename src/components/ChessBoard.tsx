import React, { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'

export interface Arrow {
  from: string
  to: string
  color: 'green' | 'blue' | 'orange' | 'red'
}

const ARROW_HEX: Record<Arrow['color'], string> = {
  blue: 'rgba(72, 130, 220, 0.85)',
  green: 'rgba(84, 176, 90, 0.85)',
  orange: 'rgba(230, 140, 30, 0.90)',
  red: 'rgba(210, 60, 60, 0.90)',
}

interface ChessBoardProps {
  /** Current position as FEN string. */
  fen: string
  selectedSquare: string | null
  legalTargets: string[]
  lastMove: { from: string; to: string } | null
  onSquareClick: (square: string) => void
  /** Called on drag-drop. Return true to accept the move, false to reject it. */
  onPieceDrop?: (from: string, to: string) => boolean
  flipped?: boolean
  arrows?: Arrow[]
  interactive?: boolean
  /** Squares to highlight in red (e.g. wrong-move feedback in trainer). */
  highlightSquares?: string[]
}

export function ChessBoard({
  fen,
  selectedSquare,
  legalTargets,
  lastMove,
  onSquareClick,
  onPieceDrop,
  flipped = false,
  arrows = [],
  interactive = true,
  highlightSquares = [],
}: ChessBoardProps) {
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    // Last-move highlight (yellow tint)
    if (lastMove) {
      const ym: React.CSSProperties = { backgroundColor: 'rgba(246, 246, 105, 0.5)' }
      styles[lastMove.from] = ym
      styles[lastMove.to] = ym
    }

    // Selected piece highlight
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(246, 246, 105, 0.75)' }
    }

    // Legal target dots
    for (const sq of legalTargets) {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(0,0,0,0.22) 29%, transparent 33%)',
        cursor: 'pointer',
      }
    }

    // Trainer wrong-move highlight (red)
    for (const sq of highlightSquares) {
      styles[sq] = { backgroundColor: 'rgba(255, 80, 80, 0.5)' }
    }

    return styles
  }, [selectedSquare, legalTargets, lastMove, highlightSquares])

  const rcbArrows = useMemo(
    () => arrows.map(a => ({ startSquare: a.from, endSquare: a.to, color: ARROW_HEX[a.color] })),
    [arrows],
  )

  const options = useMemo(
    () => ({
      position: fen,
      boardOrientation: (flipped ? 'black' : 'white') as 'white' | 'black',
      arrows: rcbArrows,
      squareStyles,
      allowDrawingArrows: false,
      allowDragging: interactive && !!onPieceDrop,
      showAnimations: true,
      animationDurationInMs: 150,
      darkSquareStyle: { backgroundColor: '#769656' },
      lightSquareStyle: { backgroundColor: '#eeeed2' },
      dropSquareStyle: { boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.28)' },
      boardStyle: {
        borderRadius: '4px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      } as React.CSSProperties,
      darkSquareNotationStyle: {
        color: '#eeeed2',
        opacity: 0.65,
        fontSize: 'clamp(8px, 1.4vw, 11px)',
        fontWeight: 700,
      } as React.CSSProperties,
      lightSquareNotationStyle: {
        color: '#769656',
        opacity: 0.65,
        fontSize: 'clamp(8px, 1.4vw, 11px)',
        fontWeight: 700,
      } as React.CSSProperties,
      onSquareClick: interactive
        ? ({ square }: { square: string }) => onSquareClick(square)
        : undefined,
      onPieceDrop: interactive && onPieceDrop
        ? ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
            if (!targetSquare) return false
            return onPieceDrop(sourceSquare, targetSquare)
          }
        : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, flipped, rcbArrows, squareStyles, interactive, onPieceDrop],
  )

  return (
    <div className="w-full" style={{ aspectRatio: '1' }}>
      <Chessboard options={options} />
    </div>
  )
}
