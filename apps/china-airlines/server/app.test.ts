// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixtures from '../test/fixtures/flights.json'
import { buildApp } from './app.js'
import { createSqliteRepo } from './sqliteRepo.js'
import type { FlightRepo } from './types.js'

const jsonRepo: FlightRepo = {
  destinations: () => fixtures.destinations,
  destination: (c) => fixtures.destinations.find((d) => d.code === c),
  flightsTo: (c) => fixtures.flights.filter((f) => f.to === c).sort((a, b) => a.priceUsd - b.priceUsd),
}

describe('API (JSON-mocked repository)', () => {
  const app = buildApp(jsonRepo)

  it('lists destinations', async () => {
    const res = await app.inject('/api/destinations')
    expect(res.json()).toHaveLength(2)
  })

  it('returns flights cheapest first', async () => {
    const res = await app.inject('/api/destinations/tyo')
    expect(res.json().flights.map((f: { id: string }) => f.id)).toEqual(['T2', 'T1'])
  })

  it('404s on unknown destination', async () => {
    expect((await app.inject('/api/destinations/XXX')).statusCode).toBe(404)
  })

  it('AI planner understands multilingual prompts', async () => {
    const res = await app.inject({ url: '/api/ai/plan', query: { q: '便宜 東京' } })
    expect(res.json()).toMatchObject({ intent: 'cheapest', destination: { code: 'TYO' } })
  })
})

describe('SQLite repository', () => {
  it('seeds an in-memory database', () => {
    const repo = createSqliteRepo(':memory:')
    expect(repo.destinations().length).toBeGreaterThan(3)
    expect(repo.flightsTo('TYO')[0].to).toBe('TYO')
  })
})
