import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Creator } from './api'
import { money } from './i18n'
import { decide, type Decision } from './swipe'

export function Card({ creator, onDecide }: { creator: Creator; onDecide: (liked: boolean) => void }) {
  const { t, i18n } = useTranslation()
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)
  const hint = decide(dx, 40)

  const end = () => {
    const d: Decision = decide(dx)
    start.current = null
    setDx(0)
    if (d) onDecide(d === 'like')
  }

  return (
    <article
      className="card"
      data-testid="card"
      style={{
        ['--hue' as string]: creator.hue,
        transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
        transition: start.current === null ? 'transform .25s' : 'none',
      }}
      onPointerDown={(e) => { start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
      onPointerUp={end}
    >
      {hint && <span className={`stamp ${hint}`}>{hint === 'like' ? t('fund') : t('pass')}</span>}
      <span className="avatar" aria-hidden="true">{creator.name.slice(0, 1)}</span>
      <div className="meta">
        <h2>{creator.name}</h2>
        <p className="city">{creator.city}</p>
        <ul className="disciplines" aria-label={t('disciplines')}>
          {creator.disciplines.map((d) => <li key={d}>{t(`disc.${d}`)}</li>)}
        </ul>
        <p className="pills">
          <span>{t('ask', { amount: money(creator.askUsd, i18n.language) })}</span>
          <span>{t('shares', { n: creator.sharesOpen })}</span>
        </p>
      </div>
    </article>
  )
}