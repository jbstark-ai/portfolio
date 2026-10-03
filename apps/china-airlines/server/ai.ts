import type { Destination } from './types.js'

export interface Plan {
  destination: Destination | null
  intent: 'cheapest' | 'fastest' | 'any'
}

const aliases: Record<string, string> = {
  東京: 'TYO', 东京: 'TYO', 도쿄: 'TYO', 日本: 'TYO', japan: 'TYO',
  台北: 'TPE', 타이베이: 'TPE', taiwan: 'TPE',
  首爾: 'SEL', 首尔: 'SEL', ソウル: 'SEL', 서울: 'SEL', korea: 'SEL',
  悉尼: 'SYD', シドニー: 'SYD', 시드니: 'SYD',
  洛杉磯: 'LAX', 洛杉矶: 'LAX', ロサンゼルス: 'LAX', 로스앤젤레스: 'LAX',
  倫敦: 'LHR', 伦敦: 'LHR', ロンドン: 'LHR', 런던: 'LHR',
}

/** Deterministic stand-in for an LLM concierge: extracts destination + intent from free text. */
export function planTrip(query: string, destinations: Destination[]): Plan {
  const q = query.toLowerCase()
  let destination =
    destinations.find((d) => q.includes(d.city.toLowerCase()) || q.includes(d.code.toLowerCase())) ?? null
  if (!destination) {
    const hit = Object.keys(aliases).find((k) => q.includes(k.toLowerCase()))
    if (hit) destination = destinations.find((d) => d.code === aliases[hit]) ?? null
  }
  const intent = /cheap|budget|便宜|安い|저렴/.test(q) ? 'cheapest' : /fast|quick|快|速|早/.test(q) ? 'fastest' : 'any'
  return { destination, intent }
}
