import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { seedDestinations, seedFlights } from './seed.js'
import type { Destination, Flight, FlightRepo } from './types.js'

export function createSqliteRepo(file = 'data/flights.db'): FlightRepo {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS destinations (
      code TEXT PRIMARY KEY, city TEXT, country TEXT, hueA INTEGER, hueB INTEGER, videoUrl TEXT);
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY, "from" TEXT, "to" TEXT, departs TEXT, durationMin INTEGER, priceUsd INTEGER);
  `)
  const count = db.prepare('SELECT COUNT(*) AS n FROM destinations').get() as { n: number }
  if (count.n === 0) {
    const insD = db.prepare('INSERT INTO destinations VALUES (?,?,?,?,?,?)')
    seedDestinations.forEach((d) => insD.run(d.code, d.city, d.country, d.hueA, d.hueB, d.videoUrl))
    const insF = db.prepare('INSERT INTO flights VALUES (?,?,?,?,?,?)')
    seedFlights.forEach((f) => insF.run(f.id, f.from, f.to, f.departs, f.durationMin, f.priceUsd))
  }
  return {
    destinations: () => db.prepare('SELECT * FROM destinations ORDER BY city').all() as unknown as Destination[],
    destination: (code) =>
      db.prepare('SELECT * FROM destinations WHERE code = ?').get(code) as unknown as Destination | undefined,
    flightsTo: (code) =>
      db.prepare('SELECT * FROM flights WHERE "to" = ? ORDER BY priceUsd').all(code) as unknown as Flight[],
  }
}
