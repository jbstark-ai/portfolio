import type { PlaidClient } from './types'

export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)
}

export function createPlaidClient(): PlaidClient {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured')
  }

  return {
    async createLinkToken(userId: string) {
      const res = await fetch('https://sandbox.plaid.com/link/token/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          user: { client_user_id: userId },
          client_name: 'STARK',
          language: 'en',
          country_codes: ['US'],
          products: ['auth', 'transactions'],
        }),
      })
      if (!res.ok) throw new Error('Failed to create link token')
      return await res.json()
    },

    async exchangeToken(publicToken: string) {
      const res = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, public_token: publicToken }),
      })
      if (!res.ok) throw new Error('Failed to exchange token')
      const data = await res.json() as { access_token: string; item_id: string }

      // Fetch accounts
      const acctRes = await fetch('https://sandbox.plaid.com/accounts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: data.access_token }),
      })
      if (!acctRes.ok) throw new Error('Failed to fetch accounts')
      const acctData = await acctRes.json() as {
        accounts: Array<{ account_id: string; official_name: string; subtype: string }>
      }

      return {
        access_token: data.access_token,
        item_id: data.item_id,
        accounts: acctData.accounts.map((a) => ({
          id: a.account_id,
          name: a.official_name || 'Unknown',
          type: a.subtype || 'checking',
        })),
      }
    },

    async getAccounts(accessToken: string) {
      const res = await fetch('https://sandbox.plaid.com/accounts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
      })
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json() as {
        accounts: Array<{ account_id: string; official_name: string; subtype: string; balances: { current: number } }>
      }
      return data.accounts.map((a) => ({
        id: a.account_id,
        name: a.official_name || 'Unknown',
        type: a.subtype || 'checking',
        balances: { current: Math.round(a.balances.current * 100) },
      }))
    },

    async getTransactions(accessToken: string) {
      const res = await fetch('https://sandbox.plaid.com/transactions/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          access_token: accessToken,
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const data = await res.json() as {
        transactions: Array<{ transaction_id: string; account_id: string; name: string; amount: number; category: string[] }>
      }
      return data.transactions.map((t) => ({
        id: t.transaction_id,
        account_id: t.account_id,
        name: t.name,
        amount: Math.round(t.amount * 100),
        category: t.category?.[0] || 'Other',
      }))
    },

    async removeItem(accessToken: string) {
      const res = await fetch('https://sandbox.plaid.com/item/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
      })
      if (!res.ok) throw new Error('Failed to remove item')
    },
  }
}

export function createNullPlaidClient(): PlaidClient {
  return {
    async createLinkToken() {
      throw new Error('plaid_not_configured')
    },
    async exchangeToken() {
      throw new Error('plaid_not_configured')
    },
    async getAccounts() {
      throw new Error('plaid_not_configured')
    },
    async getTransactions() {
      throw new Error('plaid_not_configured')
    },
    async removeItem() {
      throw new Error('plaid_not_configured')
    },
  }
}
