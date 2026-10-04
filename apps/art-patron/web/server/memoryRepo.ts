import type { Creator, Patron, Store } from './types.js'

const seedCreators: Creator[] = [
  { id: 1, name: 'Mei Lin', city: 'Taipei', disciplines: ['digital', 'sculpture', 'poetry'], hue: 340, askUsd: 4000, sharesOpen: 20 },
  { id: 2, name: 'Joon Park', city: 'Seoul', disciplines: ['painting', 'music'], hue: 210, askUsd: 9000, sharesOpen: 30 },
  { id: 3, name: 'Aiko Sato', city: 'Tokyo', disciplines: ['mixedMedia', 'fashion', 'publishing'], hue: 20, askUsd: 2500, sharesOpen: 10 },
  { id: 4, name: 'Wei Chen', city: 'Shenzhen', disciplines: ['textile', 'electronics', 'film'], hue: 280, askUsd: 15000, sharesOpen: 40 },
  { id: 5, name: 'Soo-ah Kim', city: 'Busan', disciplines: ['installation', 'performance'], hue: 45, askUsd: 7000, sharesOpen: 25 },
]

/** In-memory store; swipes reset whenever the function instance cold-starts. */
export function createMemoryRepo(creators: Creator[] = seedCreators, patrons: Patron[] = [{ id: 1, name: 'Demo Patron', budgetUsd: 8000 }]): Store {
  const swipes = new Map<string, { patronId: number; creatorId: number; liked: boolean }>()
  const creator = (id: number) => creators.find((c) => c.id === id)
  const patron = (id: number) => patrons.find((p) => p.id === id)
  return {
    creators: () => creators,
    creator,
    patron,
    saveSwipe: (patronId, creatorId, liked) => void swipes.set(`${patronId}:${creatorId}`, { patronId, creatorId, liked }),
    matches: (patronId) =>
      [...swipes.values()]
        .filter((s) => s.patronId === patronId && s.liked)
        .sort((a, b) => a.creatorId - b.creatorId)
        .map((s) => ({ creatorId: s.creatorId, patronId, mutual: patron(patronId)!.budgetUsd >= creator(s.creatorId)!.askUsd })),
  }
}
