import type { Transaction, LinkedTransaction } from './api'

export function categoryBreakdown(txs: (Transaction | LinkedTransaction)[]): Record<string, number> {
  const cats: Record<string, number> = {}
  for (const tx of txs) {
    if (tx.amountCents < 0) {
      const cat = 'category' in tx ? tx.category : 'Other'
      cats[cat] = (cats[cat] || 0) - tx.amountCents
    }
  }
  return cats
}

export function monthlyTotal(txs: (Transaction | LinkedTransaction)[]): number {
  const now = new Date()
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  return txs.reduce((sum, tx) => {
    if (new Date(tx.at) >= monthAgo && tx.amountCents < 0) return sum - tx.amountCents
    return sum
  }, 0)
}

export function roundUpTotal(txs: (Transaction | LinkedTransaction)[]): number {
  return txs.reduce((sum, tx) => {
    if (tx.amountCents < 0) {
      const abs = -tx.amountCents
      const rounded = Math.ceil(abs / 100) * 100
      return sum + (rounded - abs)
    }
    return sum
  }, 0)
}
