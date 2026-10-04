export type Account = { id: number; name: string; balanceCents: number; hue: number }
export type Transaction = { id: number; accountId: number; payee: string; memo: string; amountCents: number; at: string }
export type LinkedAccount = { id: string; name: string; type: string; balanceCents: number; itemId: string; institutionName: string }
export type LinkedTransaction = { id: string; accountId: string; payee: string; memo: string; amountCents: number; category: string; at: string; itemId: string }
export type LinkedInstitution = { id: string; name: string; linkedDate: string; accounts: Array<{ id: string; name: string; type: string }> }

export const api = {
  accounts: (): Promise<Account[]> => fetch('/api/accounts').then((r) => r.json()),
  transactions: (id: number): Promise<Transaction[]> => fetch(`/api/accounts/${id}/transactions`).then((r) => r.json()),
  transfer: async (accountId: number, payee: string, memo: string, amountCents: number) => {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, payee, memo, amountCents }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json() as Promise<Transaction>
  },
  plaidLinkToken: async (userId: string) => {
    const res = await fetch('/api/plaid/link-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) throw new Error('plaid_not_configured')
    return (await res.json()).link_token as string
  },
  plaidExchange: async (publicToken: string) => {
    const res = await fetch('/api/plaid/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicToken }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },
  openBankingAccounts: (): Promise<LinkedAccount[]> => fetch('/api/open-banking/accounts').then((r) => r.ok ? r.json() : []),
  openBankingConsents: (): Promise<LinkedInstitution[]> => fetch('/api/open-banking/consents').then((r) => r.ok ? r.json() : []),
  openBankingRevoke: async (itemId: string) => {
    const res = await fetch(`/api/open-banking/consents/${itemId}/revoke`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },
  openBankingTransactions: (): Promise<LinkedTransaction[]> => fetch('/api/open-banking/transactions').then((r) => r.ok ? r.json() : []),
  payFromLinkedAccount: async (sourceAccountId: string, targetAccountId: number, payee: string, memo: string, amountCents: number) => {
    const res = await fetch('/api/open-banking/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'linked', sourceAccountId, targetAccountId, payee, memo, amountCents }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },
}
