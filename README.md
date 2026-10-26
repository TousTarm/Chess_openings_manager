# Chess Openings Manager

A web app for building and studying a chess opening repertoire as a move tree. I used to pay for a similar Android app; after the developer pulled it from Google Play and my access code expired, I wrote my own.

## What it does

- **Repertoire as a tree:** create an opening (name, playing as White or Black) and record moves by clicking or dragging pieces. Every alternative move becomes a branch.
- **Editor:** step back and forward, jump to any move in the line, delete a branch, flip the board, add a note to every position. Moves that continue from the current position are shown as arrows.
- **ECO name of the current position**, looked up in the Lichess [chess-openings](https://github.com/lichess-org/chess-openings) database.
- **Opening library:** search the ECO database by name and browse lines (arrow keys step through moves). A whole opening family can be imported into the repertoire as one tree. If the database cannot be downloaded, a built-in list of popular openings is shown.
- **My Openings:** list of saved openings with the start of the main line, depth and number of side branches.

All data is stored in the browser's `localStorage` (key `chess_openings_v1`). There is no backend and no account. The ECO database is fetched from `raw.githubusercontent.com` at runtime.

## Tech

React 19, TypeScript, Vite 5, Tailwind CSS 3, `chess.js`, `react-chessboard`. The Docker image builds the app and serves it with nginx.

## Requirements

- Node.js and npm (the Docker build uses Node 20)
- Or Docker with Docker Compose

## Running

Development server:

```bash
npm ci
npm run dev
```

Production build (output in `dist/`):

```bash
npm run build
npm run preview
```

Docker (serves on `http://localhost:3000`):

```bash
docker compose up -d --build
```

## Tests

There are no tests.

## Structure

```
src/
  App.tsx                 page switching (home, list, editor, library)
  pages/                  Home, OpeningsList, TreeEditor, EcoBrowser
  hooks/useTreeEditor.ts  move tree editing and navigation
  components/ChessBoard.tsx
  lib/eco.ts              ECO database download, lookup by position and name
  lib/storage.ts          localStorage persistence
  lib/arrows.ts           SAN move → board arrow
  types/                  tree model and helpers
Dockerfile, docker-compose.yml
```

Built with the help of AI coding tools.
