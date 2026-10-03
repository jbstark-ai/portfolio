import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Account, type Transaction } from './api'
import { languages } from './i18n'
import { formatMoney, parseAmount } from './money'

export default function App() {
  const { t, i18n } = useTranslation()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [selected, setSelected] = useState(1)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [form, setForm] = useState({ payee: '', amount: '', memo: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const refresh = useCallback(async () => {
    const accts = await api.accounts()
    setAccounts(accts)
    setTxs(await api.transactions(selected))
  }, [selected])

  useEffect(() => { refresh() }, [refresh])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseAmount(form.amount)
    if (!cents || !form.payee.trim()) return setMsg({ ok: false, text: t('invalid') })
    try {
      await api.transfer(selected, form.payee, form.memo, cents)
      setForm({ payee: '', amount: '', memo: '' })
      setMsg({ ok: true, text: t('sent') })
      refresh()
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message === 'insufficient_funds' ? t('insufficient') : t('invalid') })
    }
  }

  return (
    <main>
      <header>
        <h1>{t('brand')}</h1>
        <nav aria-label="language">
          {languages.map((l) => (
            <button key={l.code} aria-pressed={i18n.language === l.code} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</button>
          ))}
        </nav>
      </header>
      <div className="spectrum" />
      <p className="greeting">{t('greeting')}</p>

      <section aria-label={t('accounts')} className="polaroids">
        {accounts === null ? <p>{t('loading')}</p> : accounts.map((a) => (
          <button key={a.id} className="polaroid" aria-pressed={a.id === selected} onClick={() => setSelected(a.id)}>
            <div className="photo" style={{ background: `hsl(${a.hue} 70% 60%)` }} />
            <span className="caption">{a.name}</span>
            <strong data-testid={`balance-${a.id}`}>{formatMoney(a.balanceCents, i18n.language)}</strong>
          </button>
        ))}
      </section>

      <section>
        <h2>{t('send')}</h2>
        <form onSubmit={send}>
          <input aria-label={t('payee')} placeholder={t('payee')} value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          <input aria-label={t('amount')} placeholder={t('amount')} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input aria-label={t('memo')} placeholder={t('memo')} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          <button type="submit" className="send">{t('sendBtn')}</button>
        </form>
        {msg && <p role="status" className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
      </section>

      <section>
        <h2>{t('history')}</h2>
        <ul className="history">
          {txs.length === 0 && <li>{t('noTx')}</li>}
          {txs.map((x) => (
            <li key={x.id}>
              <span>{x.memo} {x.payee}</span>
              <b className={x.amountCents < 0 ? 'neg' : 'pos'}>{formatMoney(x.amountCents, i18n.language)}</b>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}


