import type { OrderItem, OrderReceipt, ProductRepo } from './types.js'

const json = (body: unknown, status = 200) => Response.json(body, { status })

// Sum prices in integer micro-ETH so totals don't pick up floating-point noise.
const MICRO = 1_000_000

type OrderBody = { wallet?: string; items?: OrderItem[] }

/** Fetch-style handler shared by the Netlify Function and the Vite dev server. */
export function buildApp(repo: ProductRepo) {
  return async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url)

    if (req.method === 'GET' && pathname === '/api/products') return json(repo.all())

    const one = pathname.match(/^\/api\/products\/(\d+)$/)
    if (req.method === 'GET' && one) {
      const product = repo.find(Number(one[1]))
      return product ? json(product) : json({ error: 'not_found' }, 404)
    }

    if (req.method === 'POST' && pathname === '/api/orders') {
      const body = (await req.json().catch(() => null)) as OrderBody | null
      if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400)
      const { wallet = '', items } = body
      if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return json({ error: 'invalid_wallet' }, 400)
      if (!Array.isArray(items) || items.length === 0 || items.some((i) => !Number.isInteger(i.qty) || i.qty < 1))
        return json({ error: 'empty_cart' }, 400)

      let totalMicro = 0
      for (const item of items) {
        const p = repo.find(item.productId)
        if (!p) return json({ error: 'unknown_product' }, 404)
        if (p.stock < item.qty) return json({ error: 'out_of_stock', productId: p.id }, 409)
        totalMicro += Math.round(p.priceEth * MICRO) * item.qty
      }
      const totalEth = totalMicro / MICRO
      const orderId = repo.placeOrder(wallet, items, totalEth)
      const txHash = '0x' + crypto.randomUUID().replaceAll('-', '').padEnd(64, '0')
      return json({ orderId, totalEth, txHash } satisfies OrderReceipt)
    }

    return json({ error: 'not_found' }, 404)
  }
}
