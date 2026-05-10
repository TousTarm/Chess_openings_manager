import React, { useState } from 'react'
import { Home } from './pages/Home'
import { OpeningsList } from './pages/OpeningsList'
import { TreeEditor } from './pages/TreeEditor'
import { EcoBrowser } from './pages/EcoBrowser'
import type { Page } from './types'

export default function App() {
  const [page, setPage] = useState<Page>({ type: 'home' })
  const navigate = (p: Page) => setPage(p)

  switch (page.type) {
    case 'home':
      return <Home navigate={navigate} />
    case 'openings-list':
      return <OpeningsList navigate={navigate} />
    case 'editor':
      return <TreeEditor openingId={page.openingId} navigate={navigate} />
    case 'browse-eco':
      return <EcoBrowser navigate={navigate} />
    default:
      return <Home navigate={navigate} />
  }
}
