import type { Product, ProductRepo } from './types.js'

const seedProducts: Product[] = [
  { id: 1, name: 'Mushroom Kingdom NFT Pass', category: 'Collectibles', priceEth: 0.05, stock: 99, hue: 0 },
  { id: 2, name: 'Hyrule Hardware Wallet', category: 'Gear', priceEth: 0.12, stock: 25, hue: 140 },
  { id: 3, name: 'Pixel Pal Plushie', category: 'Merch', priceEth: 0.02, stock: 200, hue: 330 },
  { id: 4, name: 'Retro Staking Cartridge', category: 'Software', priceEth: 0.08, stock: 60, hue: 210 },
  { id: 5, name: 'Coin Block Mug', category: 'Merch', priceEth: 0.01, stock: 150, hue: 50 },
]

/** In-memory catalogue; stock resets whenever the function instance cold-starts. */
export function createMemoryRepo(products: Product[] = seedProducts): ProductRepo {
  const stock = structuredClone(products)
  const orders: { wallet: string; totalEth: number }[] = []
  const find = (id: number) => stock.find((p) => p.id === id)
  return {
    all: () => stock,
    find,
    placeOrder(wallet, items, totalEth) {
      for (const i of items) find(i.productId)!.stock -= i.qty
      return orders.push({ wallet, totalEth })
    },
  }
}
