import type { Product } from './api'

export type Cart = Record<number, number>

export const addToCart = (cart: Cart, id: number): Cart => ({ ...cart, [id]: (cart[id] ?? 0) + 1 })

export const removeFromCart = (cart: Cart, id: number): Cart => {
  const { [id]: qty = 0, ...rest } = cart
  return qty > 1 ? { ...rest, [id]: qty - 1 } : rest
}

export const cartCount = (cart: Cart) => Object.values(cart).reduce((a, b) => a + b, 0)

// Work in integer micro-ETH to avoid float drift.
export const cartTotal = (cart: Cart, products: Product[]) =>
  Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === Number(id))
    return sum + Math.round((p?.priceEth ?? 0) * 1e6) * qty
  }, 0) / 1e6

export const isValidWallet = (w: string) => /^0x[0-9a-fA-F]{40}$/.test(w)
