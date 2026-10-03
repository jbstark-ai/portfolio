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

export interface FlightRepo {
  destinations(): Destination[]
  destination(code: string): Destination | undefined
  flightsTo(code: string): Flight[]
}
