import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import { cartCount, cartTotal, isValidWallet } from './cart'
import { CartProvider, useCart } from './CartContext'
import { languages } from './i18n'

function Shell() {
  const { t, i18n } = useTranslation()
  const { cart } = useCart()
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">{t('brand')}</Link>
        <nav aria-label="language">
          {languages.map((l) => (
            <button key={l.code} aria-pressed={i18n.language === l.code} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</button>
          ))}
        </nav>
        <Link to="/cart" className="cart-link">{t('cart')} <b data-testid="count">{cartCount(cart)}</b></Link>
      </header>
      <Outlet />
    </>
  )
}

export function Shop() {
  const { t } = useTranslation()
  const { add } = useCart()
  const products = useQuery({ queryKey: ['products'], queryFn: api.products })
  return (
    <main>
      <h1 className="tagline">{t('tagline')}</h1>
      <ul className="grid">
        {products.data?.map((p) => (
          <li key={p.id} className="tile">
            <div className="art" style={{ background: `hsl(${p.hue} 80% 92%)`, color: `hsl(${p.hue} 70% 40%)` }}>{p.name[0]}</div>
            <h2>{p.name}</h2>
            <p>{p.category} · {t('stock', { n: p.stock })}</p>
            <strong>Ξ {p.priceEth}</strong>
            <button onClick={() => add(p.id)}>{t('add')}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function CartPage() {
  const { t } = useTranslation()
  const { cart, add, remove, clear } = useCart()
  const products = useQuery({ queryKey: ['products'], queryFn: api.products })
  const [wallet, setWallet] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const items = Object.entries(cart).map(([id, qty]) => ({ productId: Number(id), qty }))

  async function pay() {
    if (!isValidWallet(wallet)) return setMsg({ ok: false, text: t('badWallet') })
    try {
      const r = await api.order(wallet, items)
      clear()
      setMsg({ ok: true, text: `${t('paid')} ${t('tx')}: ${r.txHash.slice(0, 12)}…` })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message === 'out_of_stock' ? t('outOfStock') : t('badWallet') })
    }
  }

  return (
    <main>
      <h1>{t('cart')}</h1>
      {items.length === 0 && !msg?.ok && <p>{t('empty')}</p>}
      <ul className="lines">
        {items.map((i) => (
          <li key={i.productId}>
            <span>{products.data?.find((p) => p.id === i.productId)?.name}</span>
            <button aria-label="−" onClick={() => remove(i.productId)}>−</button>
            <b>{i.qty}</b>
            <button aria-label="+" onClick={() => add(i.productId)}>+</button>
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <>
          <p className="total">{t('total')}: Ξ {cartTotal(cart, products.data ?? [])}</p>
          <input aria-label={t('wallet')} placeholder="0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          <button className="pay" onClick={pay}>{t('checkout')}</button>
        </>
      )}
      {msg && <p role="status" className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
      <Link to="/">← {t('back')}</Link>
    </main>
  )
}

const rootRoute = createRootRoute({ component: () => <CartProvider><Shell /></CartProvider> })
const shopRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Shop })
const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cart', component: CartPage })

export const router = createRouter({ routeTree: rootRoute.addChildren([shopRoute, cartRoute]) })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
