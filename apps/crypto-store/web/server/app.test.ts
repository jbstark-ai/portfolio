// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixtures from '../test/fixtures/products.json'
import { buildApp } from './app.js'
import { createMemoryRepo } from './memoryRepo.js'

const WALLET = '0x1111111111111111111111111111111111111111'

type App = ReturnType<typeof buildApp>
const fixtureApp = () => buildApp(createMemoryRepo(fixtures))
const get = (app: App, path: string) => app(new Request(`http://test${path}`))
const order = (app: App, body: unknown) =>
  app(new Request('http://test/api/orders', { method: 'POST', body: JSON.stringify(body) }))

describe('store API (JSON fixtures)', () => {
  it('lists products', async () => {
    expect(await (await get(fixtureApp(), '/api/products')).json()).toHaveLength(2)
  })

  it('404s on unknown product', async () => {
    expect((await get(fixtureApp(), '/api/products/99')).status).toBe(404)
  })

  it('order total is the sum of prices', async () => {
    const res = await order(fixtureApp(), { wallet: WALLET, items: [{ productId: 1, qty: 1 }, { productId: 2, qty: 3 }] })
    const receipt = await res.json()
    expect(receipt.totalEth).toBe(0.08)
    expect(receipt.txHash).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('rejects a bad wallet', async () => {
    expect((await order(fixtureApp(), { wallet: 'nope', items: [{ productId: 1, qty: 1 }] })).status).toBe(400)
  })

  it('rejects out-of-stock orders', async () => {
    expect((await order(fixtureApp(), { wallet: WALLET, items: [{ productId: 1, qty: 5 }] })).status).toBe(409)
  })
})

describe('in-memory repo', () => {
  it('decrements stock on order', async () => {
    const app = buildApp(createMemoryRepo())
    const stockOf1 = async () => (await (await get(app, '/api/products/1')).json()).stock
    const before = await stockOf1()
    await order(app, { wallet: WALLET, items: [{ productId: 1, qty: 2 }] })
    expect(await stockOf1()).toBe(before - 2)
  })
})
