import type { Destination, Flight } from './types.js'

export const seedDestinations: Destination[] = [
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', hueA: 330, hueB: 260, videoUrl: null },
  { code: 'TYO', city: 'Tokyo', country: 'Japan', hueA: 350, hueB: 220, videoUrl: null },
  { code: 'SEL', city: 'Seoul', country: 'South Korea', hueA: 190, hueB: 290, videoUrl: null },
  { code: 'SYD', city: 'Sydney', country: 'Australia', hueA: 200, hueB: 30, videoUrl: null },
  { code: 'LAX', city: 'Los Angeles', country: 'United States', hueA: 20, hueB: 310, videoUrl: null },
  { code: 'LHR', city: 'London', country: 'United Kingdom', hueA: 230, hueB: 160, videoUrl: null },
]

const base = [
  ['TPE', 'HKG', 95, 140],
  ['TYO', 'TPE', 190, 260],
  ['SEL', 'TPE', 170, 230],
  ['SYD', 'TPE', 540, 780],
  ['LAX', 'TPE', 700, 910],
  ['LHR', 'TPE', 790, 1080],
] as const

export const seedFlights: Flight[] = base.flatMap(([to, from, dur, price], i) =>
  [0, 1, 2].map((k) => ({
    id: `CI${100 + i * 10 + k}`,
    from,
    to,
    departs: `2026-11-0${k + 1}T${8 + k * 4}:30:00Z`,
    durationMin: dur + k * 5,
    priceUsd: price + k * 35,
  })),
)
