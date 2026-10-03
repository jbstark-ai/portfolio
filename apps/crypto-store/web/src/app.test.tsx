import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import i18n, { languages } from './i18n'
import { addToCart, cartCount, cartTotal, isValidWallet, removeFromCart } from './cart'
import { CartProvider } from './CartContext'
import { Shop } from './router'
import products from '../test/products.json'

afterEach(() => vi.unstubAllGlobals())

describe('cart logic', () => {
  it('adds, removes and counts', () => {
    let c = addToCart(addToCart({}, 1), 1)
    expect(cartCount(c)).toBe(2)
    c = removeFromCart(removeFromCart(c, 1), 1)
    expect(c).toEqual({})
  })
  it('totals without float drift', () => {
    expect(cartTotal({ 1: 3 }, products)).toBe(0.3)
  })
  it('validates wallets', () => {
    expect(isValidWallet('0x' + 'a'.repeat(40))).toBe(true)
    expect(isValidWallet('0x123')).toBe(false)
  })
})

describe('i18n', () => {
  it('has en, zh, ja, ko with identical keys', () => {
    expect(languages.map((l) => l.code)).toEqual(['en', 'zh', 'ja', 'ko'])
    for (const l of [zh, ja, ko]) expect(Object.keys(l).sort()).toEqual(Object.keys(en).sort())
  })
})

describe('Shop (fetch mocked with JSON)', () => {
  it('renders products and adds to cart', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => products })))
    await i18n.changeLanguage('en')
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CartProvider><Shop /></CartProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Mock Pass')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Add to cart' })[0])
  })
})
