export interface Destination {
  code: string
  city: string
  country: string
  hueA: number
  hueB: number
  videoUrl: string | null
}
export interface Flight {
  id: string
  from: string
  to: string
  departs: string
  durationMin: number
  priceUsd: number
}
export interface Plan {
  destination: Destination | null
  intent: 'cheapest' | 'fastest' | 'any'
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

export const api = {
  destinations: () => get<Destination[]>('/api/destinations'),
  trip: (code: string) => get<{ destination: Destination; flights: Flight[] }>(`/api/destinations/${code}`),
  plan: (q: string) => get<Plan>(`/api/ai/plan?q=${encodeURIComponent(q)}`),
}
