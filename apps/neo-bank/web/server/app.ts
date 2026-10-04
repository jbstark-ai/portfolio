import type { BankRepo, PlaidClient, OpenBankingRepo } from './types.js'

const json = (body: unknown, status = 200) => Response.json(body, { status })

type TransferBody = { accountId?: number; payee?: string; memo?: string; amountCents?: number }
type LinkTokenBody = { userId?: string }
type ExchangeTokenBody = { publicToken?: string }
type PayBody = { sourceType?: string; sourceAccountId?: string; targetAccountId?: number; payee?: string; memo?: string; amountCents?: number }

/** Fetch-style handler shared by the Netlify Function and the Vite dev server. */
export function buildApp(repo: BankRepo, obRepo?: OpenBankingRepo, plaidClient?: PlaidClient) {
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

    // Plaid link flow
    if (req.method === 'POST' && pathname === '/api/plaid/link-token') {
      if (!plaidClient) return json({ error: 'plaid_not_configured' }, 503)
      try {
        const body = ((await req.json().catch(() => null)) ?? {}) as LinkTokenBody
        const result = await plaidClient.createLinkToken(body.userId || 'user_stark')
        return json(result)
      } catch (err) {
        return json({ error: (err as Error).message === 'plaid_not_configured' ? 'plaid_not_configured' : 'error' }, 503)
      }
    }

    if (req.method === 'POST' && pathname === '/api/plaid/exchange') {
      if (!plaidClient || !obRepo) return json({ error: 'plaid_not_configured' }, 503)
      try {
        const body = ((await req.json().catch(() => null)) ?? {}) as ExchangeTokenBody
        if (!body.publicToken?.trim()) return json({ error: 'invalid' }, 400)
        const result = await plaidClient.exchangeToken(body.publicToken)
        obRepo.addItem({
          id: result.item_id,
          accessToken: result.access_token,
          institutionName: 'Unknown',
          linkedDate: new Date().toISOString(),
          accounts: result.accounts,
        })
        return json(result)
      } catch (err) {
        return json({ error: 'error' }, 503)
      }
    }

    if (req.method === 'GET' && pathname === '/api/open-banking/accounts') {
      if (!plaidClient || !obRepo) return json({ error: 'plaid_not_configured' }, 503)
      try {
        const items = obRepo.items()
        const all: any[] = []
        for (const item of items) {
          const accts = await plaidClient.getAccounts(item.accessToken)
          for (const acct of accts) {
            const balanceCents = obRepo.getBalance(item.id, acct.id) ?? acct.balances.current
            all.push({ ...acct, balanceCents, itemId: item.id, institutionName: item.institutionName })
          }
        }
        return json(all)
      } catch (err) {
        return json({ error: 'error' }, 503)
      }
    }

    if (req.method === 'GET' && pathname === '/api/open-banking/consents') {
      if (!obRepo) return json({ error: 'not_configured' }, 503)
      const items = obRepo.items()
      const consents = items.map((item) => ({
        id: item.id,
        name: item.institutionName,
        linkedDate: item.linkedDate,
        accounts: item.accounts,
      }))
      return json(consents)
    }

    const revokeMatch = pathname.match(/^\/api\/open-banking\/consents\/([^/]+)\/revoke$/)
    if (req.method === 'POST' && revokeMatch) {
      if (!obRepo) return json({ error: 'not_configured' }, 503)
      const itemId = revokeMatch[1]
      if (!obRepo.item(itemId)) return json({ error: 'not_found' }, 404)
      obRepo.removeItem(itemId)
      return json({ ok: true })
    }

    if (req.method === 'GET' && pathname === '/api/open-banking/transactions') {
      if (!obRepo || !plaidClient) return json({ error: 'not_configured' }, 503)
      try {
        const items = obRepo.items()
        const all: any[] = []
        for (const item of items) {
          const txs = await plaidClient.getTransactions(item.accessToken)
          for (const tx of txs) {
            all.push({
              id: tx.id,
              accountId: tx.account_id,
              payee: tx.name,
              memo: '',
              amountCents: -Math.round(tx.amount * 100),
              category: tx.category,
              at: new Date().toISOString(),
              itemId: item.id,
            })
          }
        }
        return json(all)
      } catch (err) {
        return json({ error: 'error' }, 503)
      }
    }

    if (req.method === 'POST' && pathname === '/api/open-banking/pay') {
      const body = ((await req.json().catch(() => null)) ?? {}) as PayBody
      const { sourceType, sourceAccountId, targetAccountId, payee, memo = '', amountCents } = body
      if (!payee?.trim() || !Number.isInteger(amountCents) || amountCents! <= 0)
        return json({ error: 'invalid' }, 400)
      if (sourceType === 'linked') {
        if (!obRepo || !plaidClient) return json({ error: 'not_configured' }, 503)
        const [itemId, acctId] = (sourceAccountId || '').split(':')
        const item = obRepo.item(itemId)
        if (!item) return json({ error: 'not_found' }, 404)
        const balance = obRepo.getBalance(itemId, acctId) ?? 0
        if (balance < amountCents!) return json({ error: 'insufficient_funds' }, 422)
        obRepo.overrideBalance(itemId, acctId, balance - amountCents!)
        const target = repo.account(Number(targetAccountId))
        if (!target) return json({ error: 'not_found' }, 404)
        return json(repo.credit(target.id, payee.trim(), memo, amountCents!))
      }
      const account = repo.account(Number(sourceAccountId))
      if (!account) return json({ error: 'not_found' }, 404)
      if (account.balanceCents < amountCents!) return json({ error: 'insufficient_funds' }, 422)
      return json(repo.debit(account.id, payee.trim(), memo, amountCents!))
    }

    return json({ error: 'not_found' }, 404)
  }
}
