// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixtures from '../test/fixtures/flights.json'
import { buildApp } from './app.js'
import { createMemoryRepo } from './memoryRepo.js'
import type { FlightRepo } from './types.js'

const jsonRepo: FlightRepo = {
  destinations: () => fixtures.destinations,
  destination: (c) => fixtures.destinations.find((d) => d.code === c),
  flightsTo: (c) => fixtures.flights.filter((f) => f.to === c).sort((a, b) => a.priceUsd - b.priceUsd),
}

const get = (app: ReturnType<typeof buildApp>, path: string) => app(new Request(`http://test${path}`))

describe('API (JSON-mocked repository)', () => {
  const app = buildApp(jsonRepo)

  it('lists destinations', async () => {
    expect(await (await get(app, '/api/destinations')).json()).toHaveLength(2)
  })

  it('returns flights cheapest first', async () => {
    const body = await (await get(app, '/api/destinations/tyo')).json()
    expect(body.flights.map((f: { id: string }) => f.id)).toEqual(['T2', 'T1'])
  })

  it('404s on unknown destination', async () => {
    expect((await get(app, '/api/destinations/XXX')).status).toBe(404)
  })

  it('AI planner understands multilingual prompts', async () => {
    const res = await get(app, `/api/ai/plan?q=${encodeURIComponent('便宜 東京')}`)
    expect(await res.json()).toMatchObject({ intent: 'cheapest', destination: { code: 'TYO' } })
  })
})

describe('in-memory repository', () => {
  it('serves the seed data', () => {
    const repo = createMemoryRepo()
    expect(repo.destinations().length).toBeGreaterThan(3)
    expect(repo.flightsTo('TYO')[0].to).toBe('TYO')
  })
})
