export type Product = { id: number; name: string; category: string; priceEth: number; stock: number; hue: number }
export type Receipt = { orderId: number; totalEth: number; txHash: string }

export const api = {
  products: (): Promise<Product[]> => fetch('/api/products').then((r) => r.json()),
  order: async (wallet: string, items: { productId: number; qty: number }[]) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, items }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return (await res.json()) as Receipt
  },
}
