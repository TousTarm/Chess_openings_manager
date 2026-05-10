export type PieceColor = 'white' | 'black'

export type Page =
  | { type: 'home' }
  | { type: 'openings-list' }
  | { type: 'editor'; openingId: string }
  | { type: 'browse-eco' }
