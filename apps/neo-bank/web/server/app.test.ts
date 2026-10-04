// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixtures from '../test/fixtures/bank.json'
import { buildApp } from './app.js'
import { createMemoryRepo } from './memoryRepo.js'
import type { Account, BankRepo, Transaction } from './types.js'

function jsonRepo(): BankRepo {
  const accounts: Account[] = structuredClone(fixtures.accounts)
  const txs: Transaction[] = structuredClone(fixtures.transactions)
  return {
    accounts: () => accounts,
    account: (id) => accounts.find((a) => a.id === id),
    transactions: (id) => txs.filter((t) => t.accountId === id),
    debit(accountId, payee, memo, amountCents) {
      accounts.find((a) => a.id === accountId)!.balanceCents -= amountCents
      const t = { id: txs.length + 1, accountId, payee, memo, amountCents: -amountCents, at: 'now' }
      txs.push(t)
      return t
    },
  }
}

type App = ReturnType<typeof buildApp>
const get = (app: App, path: string) => app(new Request(`http://test${path}`))
const post = (app: App, path: string, body: unknown) =>
  app(new Request(`http://test${path}`, { method: 'POST', body: JSON.stringify(body) }))

describe('bank API (JSON-mocked repo)', () => {
  it('lists accounts', async () => {
    expect(await (await get(buildApp(jsonRepo()), '/api/accounts')).json()).toHaveLength(2)
  })

  it('transfers debit the balance and show up in history', async () => {
    const app = buildApp(jsonRepo())
    const res = await post(app, '/api/transfers', { accountId: 1, payee: 'Sam', amountCents: 2500 })
    expect(res.status).toBe(200)
    expect((await res.json()).amountCents).toBe(-2500)
    const accounts = await (await get(app, '/api/accounts')).json()
    expect(accounts[0].balanceCents).toBe(7500)
    expect(await (await get(app, '/api/accounts/1/transactions')).json()).toHaveLength(2)
  })

  it('rejects overdrafts with 422', async () => {
    const res = await post(buildApp(jsonRepo()), '/api/transfers', { accountId: 1, payee: 'Sam', amountCents: 99999 })
    expect(res.status).toBe(422)
  })

  it('validates input', async () => {
    const app = buildApp(jsonRepo())
    expect((await post(app, '/api/transfers', { accountId: 1, payee: '', amountCents: 5 })).status).toBe(400)
    expect((await post(app, '/api/transfers', { accountId: 1, payee: 'x', amountCents: -5 })).status).toBe(400)
    expect((await get(app, '/api/accounts/9/transactions')).status).toBe(404)
  })
})

describe('in-memory repo', () => {
  it('debits and lists newest first', () => {
    const repo = createMemoryRepo()
    const before = repo.account(1)!.balanceCents
    repo.debit(1, 'Test', '', 100)
    expect(repo.account(1)!.balanceCents).toBe(before - 100)
    expect(repo.transactions(1)[0].payee).toBe('Test')
  })
})
