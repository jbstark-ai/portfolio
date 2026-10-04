import type { OpenBankingRepo, PlaidItem, LinkedTransaction } from './types'

export function createOpenBankingRepo(): OpenBankingRepo {
  const items = new Map<string, PlaidItem>()
  const balanceOverrides = new Map<string, Record<string, number>>()
  const localTransactions: LinkedTransaction[] = []

  return {
    items() {
      return Array.from(items.values())
    },

    item(itemId: string) {
      return items.get(itemId)
    },

    addItem(item: PlaidItem) {
      items.set(item.id, item)
    },

    removeItem(itemId: string) {
      items.delete(itemId)
      balanceOverrides.delete(itemId)
      const idx = localTransactions.findIndex((t) => t.accountId.startsWith(itemId))
      if (idx !== -1) localTransactions.splice(idx, 1)
    },

    linkedAccounts() {
      return this.items().map((item) => ({
        ...item,
        balances: balanceOverrides.get(item.id) || {},
      }))
    },

    allTransactions() {
      return [...localTransactions]
    },

    overrideBalance(itemId: string, accountId: string, balanceCents: number) {
      if (!balanceOverrides.has(itemId)) {
        balanceOverrides.set(itemId, {})
      }
      balanceOverrides.get(itemId)![accountId] = balanceCents
    },

    getBalance(itemId: string, accountId: string) {
      return balanceOverrides.get(itemId)?.[accountId]
    },
  }
}
