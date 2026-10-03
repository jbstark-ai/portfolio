import Fastify from 'fastify'
import cors from '@fastify/cors'
import { planTrip } from './ai.js'
import type { FlightRepo } from './types.js'

export function buildApp(repo: FlightRepo) {
  const app = Fastify()
  app.register(cors)

  app.get('/api/destinations', async () => repo.destinations())

  app.get<{ Params: { code: string } }>('/api/destinations/:code', async (req, reply) => {
    const destination = repo.destination(req.params.code.toUpperCase())
    if (!destination) return reply.code(404).send({ error: 'not_found' })
    return { destination, flights: repo.flightsTo(destination.code) }
  })

  app.get<{ Querystring: { q?: string } }>('/api/ai/plan', async (req) =>
    planTrip(req.query.q ?? '', repo.destinations()),
  )

  return app
}
