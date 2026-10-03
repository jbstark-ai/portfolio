import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import i18n, { languages } from './i18n'
import { formatMoney, parseAmount } from './money'
import App from './App'
import accounts from '../test/accounts.json'

afterEach(() => vi.unstubAllGlobals())

describe('money', () => {
  it('parses amounts into cents', () => {
    expect(parseAmount('12.34')).toBe(1234)
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
  })
  it('formats per language', () => {
    expect(formatMoney(12345, 'en')).toBe('$123.45')
  })
})

describe('i18n', () => {
  it('has en, zh, ja, ko with identical keys', () => {
    expect(languages.map((l) => l.code)).toEqual(['en', 'zh', 'ja', 'ko'])
    for (const l of [zh, ja, ko]) expect(Object.keys(l).sort()).toEqual(Object.keys(en).sort())
  })
})

describe('App (fetch mocked with JSON)', () => {
  it('renders the polaroid balance and rejects invalid sends client-side', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ json: async () => (url === '/api/accounts' ? accounts : []) })))
    await i18n.changeLanguage('en')
    render(<App />)
    expect(await screen.findByText('$123.45')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('status')).toHaveTextContent('Check the details')
  })
})
