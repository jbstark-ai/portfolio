import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import i18n, { languages, money } from './i18n'
import { decide } from './swipe'
import App from './App'

const creators = [
  { id: 1, name: 'Mock One', city: 'Taipei', disciplines: ['painting', 'music'], hue: 10, askUsd: 1000, sharesOpen: 10 },
  { id: 2, name: 'Mock Two', city: 'Seoul', disciplines: ['film'], hue: 90, askUsd: 2000, sharesOpen: 5 },
]

afterEach(() => vi.unstubAllGlobals())

describe('swipe decisions', () => {
  it('maps drag distance to a decision', () => {
    expect(decide(150)).toBe('like')
    expect(decide(-150)).toBe('nope')
    expect(decide(30)).toBeNull()
  })
})

describe('i18n', () => {
  it('lists en, zh, ja, ko in order with matching keys', () => {
    expect(languages.map((l) => l.code)).toEqual(['en', 'zh', 'ja', 'ko'])
    for (const l of [zh, ja, ko]) expect(Object.keys(l).sort()).toEqual(Object.keys(en).sort())
  })
  it('formats currency per locale', () => {
    expect(money(4000, 'en')).toBe('$4,000')
  })
  it('translates every discipline in every locale', () => {
    for (const l of [zh, ja, ko]) expect(Object.keys(l.disc).sort()).toEqual(Object.keys(en.disc).sort())
  })
})

describe('App (fetch mocked with JSON)', () => {
  it('shows the first card and advances after a pass', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => ({
      json: async () =>
        url === '/api/creators' ? creators
        : url.includes('/matches') ? []
        : { creatorId: 1, patronId: 1, mutual: init?.body ? JSON.parse(init.body as string).liked : false },
    })))
    await i18n.changeLanguage('en')
    render(<App />)
    expect(await screen.findByText('Mock One')).toBeInTheDocument()
    expect(screen.getByText('Painting')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Pass/ }))
    expect(await screen.findByText('Mock Two')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Fund/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent("It's a match!")
  })
})
