import Fastify from 'fastify'
import cors from '@fastify/cors'
import type { BankRepo } from './types.js'

export function buildApp(repo: BankRepo) {
  const app = Fastify()
  app.register(cors)

  app.get('/api/accounts', async () => repo.accounts())

  app.get<{ Params: { id: string } }>('/api/accounts/:id/transactions', async (req, reply) => {
    const id = Number(req.params.id)
    if (!repo.account(id)) return reply.code(404).send({ error: 'not_found' })
    return repo.transactions(id)
  })

  app.post<{ Body: { accountId?: number; payee?: string; memo?: string; amountCents?: number } }>(
    '/api/transfers',
    async (req, reply) => {
      const { accountId, payee, memo = '', amountCents } = req.body ?? {}
      if (!payee?.trim() || !Number.isInteger(amountCents) || amountCents! <= 0)
        return reply.code(400).send({ error: 'invalid_transfer' })
      const account = repo.account(Number(accountId))
      if (!account) return reply.code(404).send({ error: 'not_found' })
      if (account.balanceCents < amountCents!) return reply.code(422).send({ error: 'insufficient_funds' })
      return repo.debit(account.id, payee.trim(), memo, amountCents!)
    },
  )

  return app
}
