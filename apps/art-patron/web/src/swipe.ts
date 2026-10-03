export const SWIPE_THRESHOLD = 110

export type Decision = 'like' | 'nope' | null

export function decide(dx: number, threshold = SWIPE_THRESHOLD): Decision {
  if (dx >= threshold) return 'like'
  if (dx <= -threshold) return 'nope'
  return null
}
