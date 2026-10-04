export interface Creator {
  id: number
  name: string
  city: string
  disciplines: string[]
  hue: number
  askUsd: number
  sharesOpen: number
}

export interface Patron { id: number; name: string; budgetUsd: number }

export interface Match { creatorId: number; patronId: number; mutual: boolean }

/** Abstracts persistence so tests can use a JSON-backed fake. */
export interface Store {
  creators(): Creator[]
  creator(id: number): Creator | undefined
  patron(id: number): Patron | undefined
  saveSwipe(patronId: number, creatorId: number, liked: boolean): void
  matches(patronId: number): Match[]
}
