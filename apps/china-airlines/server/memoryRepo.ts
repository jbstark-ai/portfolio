import { seedDestinations, seedFlights } from './seed.js'
import type { FlightRepo } from './types.js'

/** Read-only repository over the seed data; lives as long as the function instance. */
export function createMemoryRepo(): FlightRepo {
  const destinations = [...seedDestinations].sort((a, b) => a.city.localeCompare(b.city))
  return {
    destinations: () => destinations,
    destination: (code) => destinations.find((d) => d.code === code),
    flightsTo: (code) => seedFlights.filter((f) => f.to === code).sort((a, b) => a.priceUsd - b.priceUsd),
  }
}
