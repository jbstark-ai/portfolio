import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Account, type Transaction, type LinkedAccount, type LinkedInstitution } from './api'
import { languages } from './i18n'
import { formatMoney, parseAmount } from './money'
import { categoryBreakdown, monthlyTotal, roundUpTotal } from './insights'

declare global {
  interface Window {
    Plaid?: {
      create: (config: any) => { open: () => void; destroy: () => void }
    }
  }
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [selected, setSelected] = useState(1)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [institutions, setInstitutions] = useState<LinkedInstitution[]>([])
  const [form, setForm] = useState({ payee: '', amount: '', memo: '', sourceType: 'native', sourceAccountId: '1' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [plaidNotConfigured, setPlaidNotConfigured] = useState(false)

  const refresh = useCallback(async () => {
    const accts = await api.accounts()
    setAccounts(accts)
    setTxs(await api.transactions(selected))
    const linked = await api.openBankingAccounts()
    setLinkedAccounts(linked)
    const insts = await api.openBankingConsents()
    setInstitutions(insts)
  }, [selected])

  useEffect(() => { refresh() }, [refresh])

  async function connectBank() {
    try {
      const linkToken = await api.plaidLinkToken('user_stark')
      if (!window.Plaid) {
        setMsg({ ok: false, text: t('plaid_not_available') })
        return
      }
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          await api.plaidExchange(publicToken)
          refresh()
        },
        onExit: () => {},
      })
      handler.open()
    } catch (err) {
      setPlaidNotConfigured(true)
      setMsg({ ok: false, text: t('plaid_not_configured') })
    }
  }

  async function disconnect(itemId: string) {
    try {
      await api.openBankingRevoke(itemId)
      refresh()
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseAmount(form.amount)
    if (!cents || !form.payee.trim()) return setMsg({ ok: false, text: t('invalid') })
    try {
      if (form.sourceType === 'linked') {
        await api.payFromLinkedAccount(form.sourceAccountId, selected, form.payee, form.memo, cents)
      } else {
        const srcAcctId = Number(form.sourceAccountId)
        await api.transfer(srcAcctId, form.payee, form.memo, cents)
      }
      setForm({ payee: '', amount: '', memo: '', sourceType: 'native', sourceAccountId: '1' })
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
      <p className="greeting">{t('greeting')}</p>

      <section aria-label={t('accounts')} className="accounts">
        {accounts === null ? <p>{t('loading')}</p> : accounts.map((a) => (
          <button key={a.id} className="account-card" aria-pressed={a.id === selected} onClick={() => setSelected(a.id)}>
            <span>{a.name}</span>
            <strong data-testid={`balance-${a.id}`}>{formatMoney(a.balanceCents, i18n.language)}</strong>
          </button>
        ))}
      </section>

      <section>
        <h2>{t('send')}</h2>
        <form onSubmit={send}>
          <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value, sourceAccountId: e.target.value === 'linked' ? (linkedAccounts[0]?.id || '') : '1' })}>
            <option value="native">{t('native_account')}</option>
            {linkedAccounts.length > 0 && <optgroup label={t('linked_accounts')}>
              {linkedAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.institutionName} - {a.name}</option>
              ))}
            </optgroup>}
          </select>
          <input aria-label={t('payee')} placeholder={t('payee')} value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          <input aria-label={t('amount')} placeholder={t('amount')} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input aria-label={t('memo')} placeholder={t('memo')} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          <button type="submit" className="send">{t('sendBtn')}</button>
        </form>
        {msg && <p role="status" className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
      </section>

      <section>
        <h2>{t('insights')}</h2>
        {(() => {
          const allTxs = [...txs, ...linkedAccounts.flatMap((a) => [])]
          const cats = categoryBreakdown(allTxs)
          const monthly = monthlyTotal(allTxs)
          const roundup = roundUpTotal(allTxs)
          return cats && Object.keys(cats).length > 0 ? (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>{t('monthly_spending')}</p>
                <p style={{ fontSize: '2rem', fontWeight: '300' }}>{formatMoney(monthly, i18n.language)}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {Object.entries(cats).map(([cat, amt]) => (
                  <div key={cat} style={{ padding: '1rem', background: 'var(--mist)', borderRadius: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--slate)' }}>{cat}</p>
                    <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '300' }}>{formatMoney(amt, i18n.language)}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem', background: 'var(--accent)', color: 'white', borderRadius: '0.5rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>{t('potential_roundups')}</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '300' }}>{formatMoney(roundup, i18n.language)}</p>
              </div>
            </div>
          ) : (
            <p>{t('no_data')}</p>
          )
        })()}
      </section>

      <section>
        <h2>{t('connected_banks')}</h2>
        {plaidNotConfigured ? (
          <p style={{ color: 'var(--slate)' }}>{t('plaid_not_configured_msg')}</p>
        ) : institutions.length > 0 ? (
          <div>
            {institutions.map((inst) => (
              <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '500' }}>{inst.name}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate)' }}>{inst.accounts.length} account{inst.accounts.length !== 1 ? 's' : ''}</p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--slate)' }}>{new Date(inst.linkedDate).toLocaleDateString()}</p>
                </div>
                <button style={{ background: 'var(--accent)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }} onClick={() => disconnect(inst.id)}>
                  {t('disconnect')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>{t('no_banks')}</p>
        )}
        <button style={{ marginTop: '1.5rem', background: 'var(--green)', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }} onClick={connectBank}>
          {t('connect_bank')}
        </button>
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


