export type Creator = {
  id: number
  name: string
  city: string
  disciplines: string[]
  hue: number
  askUsd: number
  sharesOpen: number
}
export type Match = { creatorId: number; patronId: number; mutual: boolean }

export const PATRON_ID = 1
const json = (r: Response) => r.json()

export const api = {
  creators: (): Promise<Creator[]> => fetch('/api/creators').then(json),
  matches: (): Promise<Match[]> => fetch(`/api/patrons/${PATRON_ID}/matches`).then(json),
  swipe: (creatorId: number, liked: boolean): Promise<Match> =>
    fetch('/api/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patronId: PATRON_ID, creatorId, liked }),
    }).then(json),
}
