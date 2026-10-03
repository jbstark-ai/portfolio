import { languages } from './i18n'

export const formatMoney = (cents: number, lang: string) =>
  new Intl.NumberFormat(languages.find((l) => l.code === lang)?.locale ?? 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)

/** Parses "12.34" into integer cents; returns null for anything non-positive or malformed. */
export function parseAmount(input: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim())) return null
  const cents = Math.round(parseFloat(input) * 100)
  return cents > 0 ? cents : null
}
