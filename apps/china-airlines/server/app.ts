import { planTrip } from './ai.js'
import type { FlightRepo } from './types.js'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Fetch-style handler shared by the Netlify Function and the Vite dev server. */
export function buildApp(repo: FlightRepo) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)

    if (url.pathname === '/api/destinations') return json(repo.destinations())

    const trip = url.pathname.match(/^\/api\/destinations\/([^/]+)$/)
    if (trip) {
      const destination = repo.destination(trip[1].toUpperCase())
      if (!destination) return json({ error: 'not_found' }, 404)
      return json({ destination, flights: repo.flightsTo(destination.code) })
    }

    if (url.pathname === '/api/ai/plan') return json(planTrip(url.searchParams.get('q') ?? '', repo.destinations()))

    return json({ error: 'not_found' }, 404)
  }
}
