import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Creator, type Match } from './api'
import { Card } from './Card'
import { languages } from './i18n'

export default function App() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<'discover' | 'matches'>('discover')
  const [deck, setDeck] = useState<Creator[] | null>(null)
  const [all, setAll] = useState<Creator[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    Promise.all([api.creators(), api.matches()]).then(([a, m]) => {
      setAll(a)
      setMatches(m)
      setDeck(a.filter((x) => !m.some((y) => y.creatorId === x.id)))
    })
  }, [])

  async function decide(liked: boolean) {
    const top = deck![0]
    setDeck(deck!.slice(1))
    const m = await api.swipe(top.id, liked)
    if (liked) setMatches((p) => [...p, m])
    if (m.mutual) { setFlash(true); setTimeout(() => setFlash(false), 1800) }
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <h1>{t('title')}</h1>
          <p>{t('tagline')}</p>
        </div>
        <nav aria-label="language">
          {languages.map((l) => (
            <button key={l.code} aria-pressed={i18n.language === l.code} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</button>
          ))}
        </nav>
      </header>

      {tab === 'discover' && (
        <section className="deck">
          {deck === null ? <p>{t('loading')}</p> : deck.length === 0 ? <p>{t('emptyDeck')}</p> : (
            <>
              <Card key={deck[0].id} creator={deck[0]} onDecide={decide} />
              <div className="actions">
                <button className="nope" onClick={() => decide(false)}>✕ {t('pass')}</button>
                <button className="like" onClick={() => decide(true)}>♥ {t('fund')}</button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'matches' && (
        <ul className="matches">
          {matches.length === 0 && <li>{t('noMatches')}</li>}
          {matches.map((m) => (
            <li key={m.creatorId}>
              <strong>{all.find((a) => a.id === m.creatorId)?.name}</strong>
              <span>{m.mutual ? t('mutual') : t('pending')}</span>
            </li>
          ))}
        </ul>
      )}

      {flash && <div className="flash" role="alert">{t('itsAMatch')}</div>}

      <footer role="tablist" aria-label="sections">
        {(['discover', 'matches'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(k)}</button>
        ))}
      </footer>
    </div>
  )
}
