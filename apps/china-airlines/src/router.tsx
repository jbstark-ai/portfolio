import { createRootRoute, createRoute, createRouter, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import { languages } from './i18n'
import { Poster } from './Poster'

export function formatDuration(min: number) {
  return { h: Math.floor(min / 60), m: min % 60 }
}

function Shell() {
  const { t, i18n } = useTranslation()
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand"><img src="/logo.svg" alt={t('brand')} /></Link>
        <nav aria-label="language">
          {languages.map((l) => (
            <button key={l.code} aria-pressed={i18n.language === l.code} onClick={() => i18n.changeLanguage(l.code)}>
              {l.label}
            </button>
          ))}
        </nav>
      </header>
      <Outlet />
    </>
  )
}

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [missed, setMissed] = useState(false)
  const [from, setFrom] = useState('TPE')
  const [to, setTo] = useState('TYO')
  const [depart, setDepart] = useState('2026-11-01')
  const [ret, setRet] = useState('2026-11-08')
  const dests = useQuery({ queryKey: ['dests'], queryFn: api.destinations })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMissed(false)
    const plan = await api.plan(q)
    setBusy(false)
    if (!plan.destination) return setMissed(true)
    navigate({ to: '/trip/$code', params: { code: plan.destination.code }, search: { intent: plan.intent, from, depart, return: ret } })
  }

  return (
    <main className="stage">
      <Poster destination={null} />
      <section className="hero">
        <h1>{t('hero')}</h1>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ to: '/trip/$code', params: { code: to }, search: { intent: 'any', from, depart, return: ret } })
          }}
        >
          <label>
            {t('from')}
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {['TPE', ...(dests.data?.map((d) => d.code).filter((c) => c !== 'TPE') ?? [])].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            {t('to')}
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {dests.data?.map((d) => (
                <option key={d.code} value={d.code}>{d.city} ({d.code})</option>
              ))}
            </select>
          </label>
          <label>
            {t('depart')}
            <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} />
          </label>
          <label>
            {t('ret')}
            <input type="date" value={ret} onChange={(e) => setRet(e.target.value)} />
          </label>
          <button type="submit">{t('search')}</button>
        </form>
        <p className="or">{t('aiLabel')}</p>
        <form onSubmit={submit}>
          <input aria-label={t('placeholder')} placeholder={t('placeholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit">{t('go')}</button>
        </form>
        <p role="status">{busy ? t('thinking') : missed ? t('noMatch') : ''}</p>
        <ul className="chips" aria-label={t('explore')}>
          {dests.data?.map((d) => (
            <li key={d.code}>
              <Link to="/trip/$code" params={{ code: d.code }} search={{ intent: 'any', from: 'TPE', depart: undefined, return: undefined }}>{d.city}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export function Trip() {
  const { t } = useTranslation()
  const { code } = tripRoute.useParams()
  const { intent, from, depart, return: ret } = tripRoute.useSearch()
  const trip = useQuery({ queryKey: ['trip', code], queryFn: () => api.trip(code), retry: false })
  const flights = [...(trip.data?.flights ?? [])].sort((a, b) =>
    intent === 'fastest' ? a.durationMin - b.durationMin : a.priceUsd - b.priceUsd,
  )

  if (trip.isError) return <main className="stage"><Poster destination={null} /><section className="hero"><h1>{t('notFound')}</h1><Link to="/">{t('back')}</Link></section></main>

  return (
    <main className="stage">
      <Poster destination={trip.data?.destination ?? null} />
      <section className="hero">
        <Link to="/">← {t('back')}</Link>
        <h1 data-testid="city">{trip.data?.destination.city}</h1>
        <p>{t(`intent_${intent}`)} · {t('flights')}</p>
        <p data-testid="route">{t('route', { from, to: trip.data?.destination.code })}{depart && ret ? `  · ${t('dates', { depart, ret })}` : ''}</p>
        <ul className="flights">
          {flights.map((f) => {
            const { h, m } = formatDuration(f.durationMin)
            return (
              <li key={f.id}>
                <strong>{f.id}</strong>
                <span>{t('duration', { h, m })}</span>
                <span>${f.priceUsd}</span>
                <button>{t('book')}</button>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

const rootRoute = createRootRoute({ component: Shell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home })
const tripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trip/$code',
  component: Trip,
  validateSearch: (s: Record<string, unknown>) => ({
    intent: (['cheapest', 'fastest'].includes(s.intent as string) ? s.intent : 'any') as 'cheapest' | 'fastest' | 'any',
    from: typeof s.from === 'string' ? s.from : 'TPE',
    depart: typeof s.depart === 'string' ? s.depart : undefined,
    return: typeof s.return === 'string' ? s.return : undefined,
  }),
})

export const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, tripRoute]) })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}




