import type { BankRepo } from './types.js'

const json = (body: unknown, status = 200) => Response.json(body, { status })

type TransferBody = { accountId?: number; payee?: string; memo?: string; amountCents?: number }

/** Fetch-style handler shared by the Netlify Function and the Vite dev server. */
export function buildApp(repo: BankRepo) {
  return async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url)

    if (req.method === 'GET' && pathname === '/api/accounts') return json(repo.accounts())

    const history = pathname.match(/^\/api\/accounts\/([^/]+)\/transactions$/)
    if (req.method === 'GET' && history) {
      const id = Number(history[1])
      if (!repo.account(id)) return json({ error: 'not_found' }, 404)
      return json(repo.transactions(id))
    }

    if (req.method === 'POST' && pathname === '/api/transfers') {
      const body = ((await req.json().catch(() => null)) ?? {}) as TransferBody
      const { accountId, payee, memo = '', amountCents } = body
      if (!payee?.trim() || !Number.isInteger(amountCents) || amountCents! <= 0)
        return json({ error: 'invalid_transfer' }, 400)
      const account = repo.account(Number(accountId))
      if (!account) return json({ error: 'not_found' }, 404)
      if (account.balanceCents < amountCents!) return json({ error: 'insufficient_funds' }, 422)
      return json(repo.debit(account.id, payee.trim(), memo, amountCents!))
    }

    return json({ error: 'not_found' }, 404)
  }
}
