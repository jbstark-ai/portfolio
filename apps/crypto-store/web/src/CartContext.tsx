import { createContext, useContext, useState, type ReactNode } from 'react'
import { addToCart, removeFromCart, type Cart } from './cart'

type Ctx = { cart: Cart; add: (id: number) => void; remove: (id: number) => void; clear: () => void }
const CartContext = createContext<Ctx>(null!)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({})
  return (
    <CartContext.Provider
      value={{ cart, add: (id) => setCart((c) => addToCart(c, id)), remove: (id) => setCart((c) => removeFromCart(c, id)), clear: () => setCart({}) }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
