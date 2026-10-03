import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/bank.json'
import { buildApp } from '../src/app.js'
import { createSqliteRepo } from '../src/sqliteRepo.js'
import type { Account, BankRepo, Transaction } from '../src/types.js'

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

describe('bank API (JSON-mocked repo)', () => {
  it('lists accounts', async () => {
    expect((await buildApp(jsonRepo()).inject('/api/accounts')).json()).toHaveLength(2)
  })

  it('transfers debit the balance and show up in history', async () => {
    const app = buildApp(jsonRepo())
    const res = await app.inject({ method: 'POST', url: '/api/transfers', payload: { accountId: 1, payee: 'Sam', amountCents: 2500 } })
    expect(res.statusCode).toBe(200)
    expect(res.json().amountCents).toBe(-2500)
    const accounts = (await app.inject('/api/accounts')).json()
    expect(accounts[0].balanceCents).toBe(7500)
    expect((await app.inject('/api/accounts/1/transactions')).json()).toHaveLength(2)
  })

  it('rejects overdrafts with 422', async () => {
    const res = await buildApp(jsonRepo()).inject({ method: 'POST', url: '/api/transfers', payload: { accountId: 1, payee: 'Sam', amountCents: 99999 } })
    expect(res.statusCode).toBe(422)
  })

  it('validates input', async () => {
    const app = buildApp(jsonRepo())
    expect((await app.inject({ method: 'POST', url: '/api/transfers', payload: { accountId: 1, payee: '', amountCents: 5 } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: '/api/transfers', payload: { accountId: 1, payee: 'x', amountCents: -5 } })).statusCode).toBe(400)
    expect((await app.inject('/api/accounts/9/transactions')).statusCode).toBe(404)
  })
})

describe('SQLite repo', () => {
  it('debits atomically', () => {
    const repo = createSqliteRepo(':memory:')
    const before = repo.account(1)!.balanceCents
    repo.debit(1, 'Test', '', 100)
    expect(repo.account(1)!.balanceCents).toBe(before - 100)
    expect(repo.transactions(1)[0].payee).toBe('Test')
  })
})
