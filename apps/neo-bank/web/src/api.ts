export type Account = { id: number; name: string; balanceCents: number; hue: number }
export type Transaction = { id: number; accountId: number; payee: string; memo: string; amountCents: number; at: string }

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
}
