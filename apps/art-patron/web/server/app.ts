import type { Store } from './types.js'

const json = (body: unknown, status = 200) => Response.json(body, { status })

type SwipeBody = { patronId?: number; creatorId?: number; liked?: boolean }

/** Fetch-style handler shared by the Netlify Function and the Vite dev server. */
export function buildApp(store: Store) {
  return async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url)

    if (req.method === 'GET' && pathname === '/api/creators') return json(store.creators())

    const matches = pathname.match(/^\/api\/patrons\/([^/]+)\/matches$/)
    if (req.method === 'GET' && matches) return json(store.matches(Number(matches[1])))

    if (req.method === 'POST' && pathname === '/api/swipes') {
      const body = (await req.json().catch(() => null)) as SwipeBody | null
      if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400)
      const patron = store.patron(Number(body.patronId))
      const creator = store.creator(Number(body.creatorId))
      if (!patron || !creator) return json({ error: 'not_found' }, 404)
      const liked = body.liked === true
      store.saveSwipe(patron.id, creator.id, liked)
      // A like becomes a mutual match when the patron can cover the artist's ask.
      return json({ creatorId: creator.id, patronId: patron.id, mutual: liked && patron.budgetUsd >= creator.askUsd })
    }

    return json({ error: 'not_found' }, 404)
  }
}
