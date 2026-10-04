export interface Product { id: number; name: string; category: string; priceEth: number; stock: number; hue: number }
export interface OrderItem { productId: number; qty: number }
export interface OrderReceipt { orderId: number; totalEth: number; txHash: string }

export interface ProductRepo {
  all(): Product[]
  find(id: number): Product | undefined
  /** Decrements stock for each item and returns the new order id. */
  placeOrder(wallet: string, items: OrderItem[], totalEth: number): number
}
