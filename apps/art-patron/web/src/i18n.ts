import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

export const languages = [
  { code: 'en', label: 'EN', locale: 'en-US' },
  { code: 'zh', label: '中文', locale: 'zh-TW' },
  { code: 'ja', label: '日本語', locale: 'ja-JP' },
  { code: 'ko', label: '한국어', locale: 'ko-KR' },
] as const

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh }, ja: { translation: ja }, ko: { translation: ko } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export const money = (usd: number, lang: string) =>
  new Intl.NumberFormat(languages.find((l) => l.code === lang)?.locale ?? 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd)

export default i18n
