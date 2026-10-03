import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Account, BankRepo, Transaction } from './types.js'

export function createSqliteRepo(file = 'data/bank.db'): BankRepo {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, name TEXT, balanceCents INTEGER, hue INTEGER);
    CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, accountId INTEGER, payee TEXT, memo TEXT, amountCents INTEGER, at TEXT);
  `)
  if ((db.prepare('SELECT COUNT(*) n FROM accounts').get() as { n: number }).n === 0) {
    db.exec(`INSERT INTO accounts VALUES (1,'Everyday',248050,50),(2,'Savings',1200000,190)`)
    const ins = db.prepare('INSERT INTO transactions (accountId,payee,memo,amountCents,at) VALUES (?,?,?,?,?)')
    ins.run(1, 'Boba Time', '🧋', -650, '2026-10-01T09:12:00Z')
    ins.run(1, 'Film Lab', 'Instant film x3', -3600, '2026-10-02T14:40:00Z')
    ins.run(2, 'Salary', '💸', 350000, '2026-09-30T08:00:00Z')
  }
  return {
    accounts: () => db.prepare('SELECT * FROM accounts ORDER BY id').all() as unknown as Account[],
    account: (id) => db.prepare('SELECT * FROM accounts WHERE id=?').get(id) as unknown as Account | undefined,
    transactions: (id) =>
      db.prepare('SELECT * FROM transactions WHERE accountId=? ORDER BY at DESC, id DESC').all(id) as unknown as Transaction[],
    debit(accountId, payee, memo, amountCents) {
      db.exec('BEGIN')
      try {
        db.prepare('UPDATE accounts SET balanceCents = balanceCents - ? WHERE id=?').run(amountCents, accountId)
        const at = new Date().toISOString()
        const r = db
          .prepare('INSERT INTO transactions (accountId,payee,memo,amountCents,at) VALUES (?,?,?,?,?)')
          .run(accountId, payee, memo, -amountCents, at)
        db.exec('COMMIT')
        return { id: Number(r.lastInsertRowid), accountId, payee, memo, amountCents: -amountCents, at }
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

