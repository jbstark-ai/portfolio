import type { Account, BankRepo, Transaction } from './types.js'

/** In-memory bank seeded with demo data; resets whenever the function instance cold-starts. */
export function createMemoryRepo(): BankRepo {
  const accounts: Account[] = [
    { id: 1, name: 'Everyday', balanceCents: 248050, hue: 50 },
    { id: 2, name: 'Savings', balanceCents: 1200000, hue: 190 },
  ]
  const txs: Transaction[] = [
    { id: 1, accountId: 1, payee: 'Boba Time', memo: '🧋', amountCents: -650, at: '2026-10-01T09:12:00Z' },
    { id: 2, accountId: 1, payee: 'Film Lab', memo: 'Instant film x3', amountCents: -3600, at: '2026-10-02T14:40:00Z' },
    { id: 3, accountId: 2, payee: 'Salary', memo: '💸', amountCents: 350000, at: '2026-09-30T08:00:00Z' },
  ]
  return {
    accounts: () => accounts,
    account: (id) => accounts.find((a) => a.id === id),
    transactions: (id) =>
      txs.filter((t) => t.accountId === id).sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id),
    debit(accountId, payee, memo, amountCents) {
      accounts.find((a) => a.id === accountId)!.balanceCents -= amountCents
      const t = { id: txs.length + 1, accountId, payee, memo, amountCents: -amountCents, at: new Date().toISOString() }
      txs.push(t)
      return t
    },
  }
}
