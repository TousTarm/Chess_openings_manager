import type { OpeningTree } from '../types/tree'

const KEY = 'chess_openings_v1'

function loadAll(): OpeningTree[] {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        return JSON.parse(raw) as OpeningTree[]
    } catch {
        return []
    }
}

function saveAll(trees: OpeningTree[]): void {
    localStorage.setItem(KEY, JSON.stringify(trees))
}

export const storage = {
    list(): OpeningTree[] {
        return loadAll()
    },

    get(id: string): OpeningTree | null {
        return loadAll().find(t => t.id === id) ?? null
    },

    save(tree: OpeningTree): void {
        const all = loadAll()
        const idx = all.findIndex(t => t.id === tree.id)
        if (idx >= 0) {
            all[idx] = tree
        } else {
            all.push(tree)
        }
        saveAll(all)
    },

    delete(id: string): void {
        saveAll(loadAll().filter(t => t.id !== id))
    },
}
