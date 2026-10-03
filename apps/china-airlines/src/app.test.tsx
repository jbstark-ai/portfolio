import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import i18n, { languages } from './i18n'
import { Poster, posterImage } from './Poster'
import { formatDuration } from './router'

describe('i18n', () => {
  it('orders languages en, zh, ja, ko', () => {
    expect(languages.map((l) => l.code)).toEqual(['en', 'zh', 'ja', 'ko'])
  })
  it('has identical keys in every locale', () => {
    const keys = Object.keys(en).sort()
    for (const l of [zh, ja, ko]) expect(Object.keys(l).sort()).toEqual(keys)
  })
  it('interpolates durations per language', async () => {
    await i18n.changeLanguage('ja')
    expect(i18n.t('duration', { h: 3, m: 10 })).toBe('3時間10分')
    await i18n.changeLanguage('en')
  })
})

describe('Poster', () => {
  it('renders the destination code and no video when absent', () => {
    render(<Poster destination={{ code: 'TYO', city: 'Tokyo', country: 'Japan', hueA: 1, hueB: 2, videoUrl: null }} />)
    expect(screen.getByText('TYO')).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
    expect(screen.getByRole('img')).toHaveAttribute('src', '/destinations/TYO.jpg')
  })
  it('resolves a local photo per destination with a fallback', () => {
    expect(posterImage('TYO')).toBe('/destinations/TYO.jpg')
    expect(posterImage(null)).toBe('/destinations/HOME.jpg')
  })
})

it('formats durations', () => {
  expect(formatDuration(190)).toEqual({ h: 3, m: 10 })
})



it('has search-form labels in every locale', () => {
  for (const l of [en, zh, ja, ko]) for (const k of ['from', 'to', 'depart', 'ret', 'search', 'route', 'dates']) expect(l).toHaveProperty(k)
})
