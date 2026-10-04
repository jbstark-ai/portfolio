// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixtures from '../test/fixtures/patron.json'
import { buildApp } from './app.js'
import { createMemoryRepo } from './memoryRepo.js'

type App = ReturnType<typeof buildApp>
const fixtureApp = () => buildApp(createMemoryRepo(fixtures.creators, fixtures.patrons))
const get = (app: App, path: string) => app(new Request(`http://test${path}`))
const swipe = (app: App, body: string) => app(new Request('http://test/api/swipes', { method: 'POST', body }))

describe('patron API (JSON fixtures)', () => {
  it('lists creators', async () => {
    expect(await (await get(fixtureApp(), '/api/creators')).json()).toHaveLength(2)
  })

  it('is a mutual match only when the budget covers the ask', async () => {
    const app = fixtureApp()
    expect((await (await swipe(app, '{"patronId":1,"creatorId":1,"liked":true}')).json()).mutual).toBe(true)
    expect((await (await swipe(app, '{"patronId":1,"creatorId":2,"liked":true}')).json()).mutual).toBe(false)
  })

  it('validates swipes', async () => {
    const app = fixtureApp()
    expect((await swipe(app, 'nope')).status).toBe(400)
    expect((await swipe(app, '{"patronId":9,"creatorId":1,"liked":true}')).status).toBe(404)
  })
})

describe('seeded in-memory store', () => {
  it('records liked swipes as matches', async () => {
    const app = buildApp(createMemoryRepo())
    await swipe(app, '{"patronId":1,"creatorId":1,"liked":true}')
    await swipe(app, '{"patronId":1,"creatorId":2,"liked":false}')
    expect(await (await get(app, '/api/patrons/1/matches')).json()).toEqual([{ creatorId: 1, patronId: 1, mutual: true }])
  })
})
