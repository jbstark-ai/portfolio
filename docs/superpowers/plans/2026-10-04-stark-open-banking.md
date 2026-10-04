# STARK Starling/TD Redesign + Plaid Open Banking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign STARK's UI to fuse Starling Bank's card-based patterns and TD Bank's brand/structure cues with STARK's existing green/slate palette, and add a real Plaid-sandbox-backed Open Banking layer: account aggregation, payment initiation, spending insights, and consent management.

**Architecture:** Extend the existing fetch-style router in `server/app.ts` (no framework change) with Plaid-backed routes, a new in-memory `OpenBankingRepo` alongside the existing `BankRepo`, and a `PlaidClient` abstraction (real Node SDK implementation + a `NullPlaidClient` for the unconfigured case) so route handlers never call the `plaid` package directly. Frontend stays a single-page app (no router) with new stacked `<section>`s, matching the current structure.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, Playwright, `@netlify/functions`; adding `plaid` (server) and `react-plaid-link` (client).

**Spec:** `docs/superpowers/specs/2026-10-04-stark-open-banking-design.md`

## Global Constraints

- Palette: `--green: #0f7b4f` primary, `--slate: #46525e` secondary — no purple/coral (avoid a literal Starling clone).
- Drop the polaroid/photo account cards entirely; no new charting library for insights (plain CSS tiles/bars).
- `PLAID_CLIENT_ID` / `PLAID_SECRET` are read via `process.env` only, Plaid sandbox environment, never committed.
- All new server-side storage (Plaid items, balance overrides, local transactions) lives in module-level in-memory stores, same as `memoryRepo.ts` today — resets on cold start, documented as acceptable for sandbox-only data.
- Payment initiation never calls a real Plaid Payment Initiation endpoint — the source balance/account is real Plaid data, but the money movement is a local ledger operation (debit a cached override, credit the native `BankRepo` account).
- Existing aria-labels, `data-testid`s, and i18n keys used by current tests (`balance-${id}`, "To", "Amount (USD)", "Send", button role names) must keep working unchanged.
- New user-facing copy must be added to all four locale files (`en`, `zh`, `ja`, `ko`) with identical key sets, per the existing i18n test's invariant.

## Review Focus

- Plaid not configured (missing env vars): a user clicking "Connect a bank" before Netlify env vars are set must see a clear message, not a silent failure or crash.
- Revoking a consent twice (or an already-removed item): the second revoke must 404 gracefully, not crash the consent list UI.
- Paying from a linked account more than once in a row: the balance override must compound correctly (debit from the last known balance), not reset to Plaid's stale reported balance each time.
- Insights with zero transactions (new/empty state): category breakdown, round-up total, and monthly total must render a zero/empty state, not `NaN` or a crash.
- Disconnecting a bank while one of its accounts is selected as a payment source: submitting a payment against a now-revoked `itemId`/`accountId` must be rejected server-side (404), and the UI must not leave a stale selection that silently fails.

---

## Task 1: Visual redesign — card-based layout, drop photos

**Files:**
- Modify: `apps/neo-bank/web/src/styles.css`
- Modify: `apps/neo-bank/web/src/App.tsx`

**Interfaces:**
- Consumes: nothing new — existing `Account`/`Transaction` types from `src/api.ts`.
- Produces: CSS classes `.accounts` (replaces `.polaroids`), `.account-card` (replaces `.polaroid`), `.balance` (bold balance figure). Later tasks append new `<section>`s after this one using the same `section`/`h2` pattern already in `App.tsx`.

- [ ] **Step 1: Run the existing test suites to confirm a green baseline**

Run: `cd apps/neo-bank/web && npm test && npm run test:e2e`
Expected: all current tests PASS (this is the regression baseline for this task).

- [ ] **Step 2: Rewrite `styles.css` design tokens and card layout**

Keep `--green: #0f7b4f` and `--slate: #46525e`. Replace `.polaroids`/`.polaroid`/`.photo`/`.caption` with `.accounts` (flex row of cards) and `.account-card` (rounded card, bold `.balance` figure, no image). Add one warm accent token (e.g. `--accent`) for later use by insights/alerts. Keep `.history`, `form`, `.send`, `.ok`/`.err` rules as-is (still used unchanged).

- [ ] **Step 3: Update `App.tsx` markup to drop the photo and use the new classes**

Replace the `<section className="polaroids">...</section>` block: drop the `<img src={`/accounts/${a.id}.jpg`} alt="" />` and the `.photo`/`.caption` wrapper. Keep `data-testid={`balance-${a.id}`}`, `aria-pressed={a.id === selected}`, and the `onClick` unchanged. Render account name and balance inside `.account-card`.

- [ ] **Step 4: Re-run unit and e2e tests to confirm no regression**

Run: `cd apps/neo-bank/web && npm test && npm run test:e2e`
Expected: all tests PASS unchanged (same assertions as Step 1 — `getByTestId('balance-1')`, `getByRole('status')`, etc. still resolve).

- [ ] **Step 5: Commit**

```bash
git add apps/neo-bank/web/src/styles.css apps/neo-bank/web/src/App.tsx
git commit -m "redesign STARK as card-based layout, drop photo cards"
```

---

## Task 2: Plaid client abstraction (real + null implementations)

**Files:**
- Create: `apps/neo-bank/web/server/plaid.ts`
- Create: `apps/neo-bank/web/server/plaid.test.ts`
- Modify: `apps/neo-bank/web/package.json` (add `plaid` dependency)

**Interfaces:**
- Produces (relied on by Tasks 4, 5, 8):
  ```ts
  export interface PlaidAccount { accountId: string; itemId: string; name: string; mask: string; balanceCents: number }
  export interface PlaidTransactionRecord { id: string; accountId: string; payee: string; amountCents: number; at: string; category: string }
  export interface PlaidClient {
    createLinkToken(): Promise<string>
    exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string; institutionName: string }>
    getAccounts(accessToken: string): Promise<PlaidAccount[]>
    getTransactions(accessToken: string): Promise<PlaidTransactionRecord[]>
    removeItem(accessToken: string): Promise<void>
  }
  export function isPlaidConfigured(): boolean
  export function createPlaidClient(): PlaidClient
  export function createNullPlaidClient(): PlaidClient
  ```
  Every `createNullPlaidClient()` method rejects with `new Error('plaid_not_configured')` — this exact message string is the contract later route handlers match on.

- [ ] **Step 1: Write failing tests for `isPlaidConfigured` and `createNullPlaidClient`**

```ts
// plaid.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNullPlaidClient, isPlaidConfigured } from './plaid.js'

afterEach(() => vi.unstubAllEnvs())

describe('isPlaidConfigured', () => {
  it('is false when env vars are missing', () => {
    vi.stubEnv('PLAID_CLIENT_ID', '')
    vi.stubEnv('PLAID_SECRET', '')
    expect(isPlaidConfigured()).toBe(false)
  })
  it('is true when both env vars are set', () => {
    vi.stubEnv('PLAID_CLIENT_ID', 'id')
    vi.stubEnv('PLAID_SECRET', 'secret')
    expect(isPlaidConfigured()).toBe(true)
  })
})

describe('createNullPlaidClient', () => {
  it('rejects every method with plaid_not_configured', async () => {
    const client = createNullPlaidClient()
    await expect(client.createLinkToken()).rejects.toThrow('plaid_not_configured')
    await expect(client.getAccounts('x')).rejects.toThrow('plaid_not_configured')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run server/plaid.test.ts`
Expected: FAIL — `plaid.ts` does not exist yet.

- [ ] **Step 3: Add the `plaid` dependency**

Run: `cd apps/neo-bank/web && npm install plaid`

- [ ] **Step 4: Implement `server/plaid.ts`**

`isPlaidConfigured()` returns `Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)`. `createNullPlaidClient()` returns an object literal whose five methods each `return Promise.reject(new Error('plaid_not_configured'))`. `createPlaidClient()` builds a `plaid` package `Configuration` with `PlaidEnvironments.sandbox` and the two env vars as client ID/secret headers, constructs a `PlaidApi`, and implements the five `PlaidClient` methods by calling the corresponding Plaid endpoints (`/link/token/create`, `/item/public_token/exchange` + `/institutions/get_by_id` for the name, `/accounts/balance/get`, `/transactions/sync`, `/item/remove`), converting Plaid's dollar amounts to integer cents and mapping Plaid's `personal_finance_category.primary` (or `category[0]`) to `category`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run server/plaid.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/neo-bank/web/server/plaid.ts apps/neo-bank/web/server/plaid.test.ts apps/neo-bank/web/package.json apps/neo-bank/web/package-lock.json
git commit -m "add Plaid client abstraction with real and null implementations"
```

---

## Task 3: OpenBankingRepo (in-memory items, balance overrides, local transactions)

**Files:**
- Modify: `apps/neo-bank/web/server/types.ts`
- Create: `apps/neo-bank/web/server/openBankingRepo.ts`
- Create: `apps/neo-bank/web/server/openBankingRepo.test.ts`

**Interfaces:**
- Consumes: `PlaidTransactionRecord` category/shape conventions from Task 2 (not its types directly — `LinkedTransaction` is its own type, defined here).
- Produces (relied on by Tasks 4, 5, 8):
  ```ts
  export interface PlaidItem { itemId: string; accessToken: string; institutionName: string; linkedAt: string }
  export interface LinkedTransaction { id: string; accountId: string; payee: string; memo: string; amountCents: number; at: string; category: string }
  export interface OpenBankingRepo {
    items(): PlaidItem[]
    addItem(item: PlaidItem): void
    removeItem(itemId: string): boolean
    balanceOverride(accountId: string): number | undefined
    recordPayment(accountId: string, tx: LinkedTransaction): void
    localTransactions(accountId: string): LinkedTransaction[]
  }
  export function createMemoryOpenBankingRepo(): OpenBankingRepo
  ```
  `recordPayment` sets the balance override to `tx.amountCents + (previous override ?? caller-supplied current balance)` — see Step 3 for the exact precedence rule.

- [ ] **Step 1: Write failing tests**

```ts
// openBankingRepo.test.ts
import { describe, expect, it } from 'vitest'
import { createMemoryOpenBankingRepo } from './openBankingRepo.js'

describe('createMemoryOpenBankingRepo', () => {
  it('adds and lists items', () => {
    const repo = createMemoryOpenBankingRepo()
    repo.addItem({ itemId: 'i1', accessToken: 'tok', institutionName: 'Test Bank', linkedAt: '2026-01-01T00:00:00Z' })
    expect(repo.items()).toEqual([{ itemId: 'i1', accessToken: 'tok', institutionName: 'Test Bank', linkedAt: '2026-01-01T00:00:00Z' }])
  })

  it('removes an item and reports whether it existed', () => {
    const repo = createMemoryOpenBankingRepo()
    repo.addItem({ itemId: 'i1', accessToken: 'tok', institutionName: 'Test Bank', linkedAt: '2026-01-01T00:00:00Z' })
    expect(repo.removeItem('i1')).toBe(true)
    expect(repo.items()).toEqual([])
    expect(repo.removeItem('i1')).toBe(false)
  })

  it('has no balance override until a payment is recorded', () => {
    const repo = createMemoryOpenBankingRepo()
    expect(repo.balanceOverride('a1')).toBeUndefined()
  })

  it('recordPayment sets the override and appends a local transaction, newest first', () => {
    const repo = createMemoryOpenBankingRepo()
    repo.recordPayment('a1', { id: 't1', accountId: 'a1', payee: 'Sam', memo: '', amountCents: -500, at: '2026-01-01T00:00:00Z', category: 'Transfer' })
    expect(repo.balanceOverride('a1')).toBe(-500)
    repo.recordPayment('a1', { id: 't2', accountId: 'a1', payee: 'Sam', memo: '', amountCents: -300, at: '2026-01-02T00:00:00Z', category: 'Transfer' })
    expect(repo.balanceOverride('a1')).toBe(-800)
    expect(repo.localTransactions('a1').map((t) => t.id)).toEqual(['t2', 't1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run server/openBankingRepo.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Add the new types to `server/types.ts`** and **implement `server/openBankingRepo.ts`**

Add `PlaidItem`, `LinkedTransaction`, `OpenBankingRepo` to `types.ts` exactly as specified above. In `openBankingRepo.ts`, hold `items: PlaidItem[]`, `overrides: Map<string, number>`, `localTxs: Map<string, LinkedTransaction[]>` in closure scope (same module-level-reset pattern as `memoryRepo.ts`). `recordPayment(accountId, tx)` does `overrides.set(accountId, (overrides.get(accountId) ?? 0) + tx.amountCents)` and unshifts `tx` onto that account's local transaction list. `balanceOverride` is a cumulative **delta**, not an absolute balance — every consumer (Tasks 4 and 8) always computes the displayed/usable balance as `plaidReportedBalance + (balanceOverride(accountId) ?? 0)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run server/openBankingRepo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/neo-bank/web/server/types.ts apps/neo-bank/web/server/openBankingRepo.ts apps/neo-bank/web/server/openBankingRepo.test.ts
git commit -m "add in-memory OpenBankingRepo for linked items and local payment ledger"
```

---

## Task 4: Backend — link flow + account aggregation

**Files:**
- Modify: `apps/neo-bank/web/server/app.ts`
- Modify: `apps/neo-bank/web/netlify/functions/api.ts`
- Modify: `apps/neo-bank/web/server/app.test.ts`

**Interfaces:**
- Consumes: `PlaidClient`, `isPlaidConfigured`, `createPlaidClient`, `createNullPlaidClient` (Task 2); `OpenBankingRepo`, `createMemoryOpenBankingRepo` (Task 3).
- Produces: `buildApp(bankRepo: BankRepo, obRepo: OpenBankingRepo, plaid: PlaidClient)` — signature changes from today's single-arg form; routes `POST /api/plaid/link-token`, `POST /api/plaid/exchange`, `GET /api/open-banking/accounts` consumed by Task 6 (frontend) and reused unchanged by Task 5/8.

- [ ] **Step 1: Write failing tests using a fake `PlaidClient`**

```ts
// app.test.ts additions
function fakePlaid(overrides: Partial<PlaidClient> = {}): PlaidClient {
  return {
    createLinkToken: async () => 'link-sandbox-token',
    exchangePublicToken: async () => ({ accessToken: 'access-1', itemId: 'item-1', institutionName: 'Test Bank' }),
    getAccounts: async () => [{ accountId: 'acct-1', itemId: 'item-1', name: 'Checking', mask: '1111', balanceCents: 10000 }],
    getTransactions: async () => [],
    removeItem: async () => {},
    ...overrides,
  }
}

describe('open banking: link + aggregation', () => {
  it('creates a link token', async () => {
    const app = buildApp(jsonRepo(), createMemoryOpenBankingRepo(), fakePlaid())
    const res = await post(app, '/api/plaid/link-token', {})
    expect(await res.json()).toEqual({ linkToken: 'link-sandbox-token' })
  })

  it('exchanges a public token and stores the item without leaking the access token', async () => {
    const app = buildApp(jsonRepo(), createMemoryOpenBankingRepo(), fakePlaid())
    const res = await post(app, '/api/plaid/exchange', { publicToken: 'public-1' })
    const body = await res.json()
    expect(body).toEqual({ itemId: 'item-1', institutionName: 'Test Bank', linkedAt: expect.any(String) })
    expect(body.accessToken).toBeUndefined()
  })

  it('aggregates accounts across items, applying a balance override when present', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'access-1', institutionName: 'Test Bank', linkedAt: 'now' })
    obRepo.recordPayment('acct-1', { id: 't1', accountId: 'acct-1', payee: 'Sam', memo: '', amountCents: -2000, at: 'now', category: 'Transfer' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    const res = await get(app, '/api/open-banking/accounts')
    expect((await res.json())[0].balanceCents).toBe(10000 - 2000)
  })

  it('returns 503 plaid_not_configured when the client is unconfigured', async () => {
    const app = buildApp(jsonRepo(), createMemoryOpenBankingRepo(), createNullPlaidClient())
    const res = await post(app, '/api/plaid/link-token', {})
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('plaid_not_configured')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: FAIL — `buildApp` has the old signature, new routes don't exist.

- [ ] **Step 3: Update `buildApp` signature and add the three routes**

`buildApp(bankRepo: BankRepo, obRepo: OpenBankingRepo, plaid: PlaidClient)`. Wrap each Plaid-calling route body in `try { ... } catch (e) { return (e as Error).message === 'plaid_not_configured' ? json({ error: 'plaid_not_configured' }, 503) : json({ error: 'plaid_error' }, 502) }`.

- `POST /api/plaid/link-token` → `json({ linkToken: await plaid.createLinkToken() })`
- `POST /api/plaid/exchange` → reads `{ publicToken }`, calls `plaid.exchangePublicToken`, builds a `PlaidItem` with `linkedAt: new Date().toISOString()`, calls `obRepo.addItem`, responds with `{ itemId, institutionName, linkedAt }` (no `accessToken`)
- `GET /api/open-banking/accounts` → for each `obRepo.items()`, call `plaid.getAccounts(item.accessToken)`, for each returned account apply `obRepo.balanceOverride(accountId) ?? account.balanceCents` adjustment as `account.balanceCents + (obRepo.balanceOverride(accountId) ?? 0)`, flatten and return

- [ ] **Step 4: Wire real vs. null client in the Netlify function**

In `netlify/functions/api.ts`: `const plaid = isPlaidConfigured() ? createPlaidClient() : createNullPlaidClient()`; `export default buildApp(createMemoryRepo(), createMemoryOpenBankingRepo(), plaid)`. Apply the identical change to `vite.config.ts`'s `devApi(buildApp(createMemoryRepo()))` call, which must be updated to the new three-argument `buildApp` signature the same way.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/neo-bank/web/server/app.ts apps/neo-bank/web/server/app.test.ts apps/neo-bank/web/netlify/functions/api.ts apps/neo-bank/web/vite.config.ts
git commit -m "add Plaid link flow and account aggregation endpoints"
```

---

## Task 5: Backend — consent management (list + revoke)

**Files:**
- Modify: `apps/neo-bank/web/server/app.ts`
- Modify: `apps/neo-bank/web/server/app.test.ts`

**Interfaces:**
- Consumes: `buildApp` signature from Task 4.
- Produces: `GET /api/open-banking/consents`, `POST /api/open-banking/consents/:itemId/revoke` — consumed by Task 6.

- [ ] **Step 1: Write failing tests**

```ts
describe('open banking: consents', () => {
  it('lists connected institutions without access tokens', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'secret', institutionName: 'Test Bank', linkedAt: '2026-01-01T00:00:00Z' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    const body = await (await get(app, '/api/open-banking/consents')).json()
    expect(body).toEqual([{ itemId: 'item-1', institutionName: 'Test Bank', linkedAt: '2026-01-01T00:00:00Z' }])
  })

  it('revokes a connected institution', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'secret', institutionName: 'Test Bank', linkedAt: 'now' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    const res = await post(app, '/api/open-banking/consents/item-1/revoke', {})
    expect(res.status).toBe(200)
    expect(obRepo.items()).toEqual([])
  })

  it('404s revoking an item that is not (or no longer) connected', async () => {
    const app = buildApp(jsonRepo(), createMemoryOpenBankingRepo(), fakePlaid())
    const res = await post(app, '/api/open-banking/consents/missing/revoke', {})
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: FAIL — routes don't exist yet.

- [ ] **Step 3: Implement the two routes**

`GET /api/open-banking/consents` → `json(obRepo.items().map(({ itemId, institutionName, linkedAt }) => ({ itemId, institutionName, linkedAt })))`. `POST /api/open-banking/consents/:itemId/revoke` → find the item in `obRepo.items()`; if missing, `json({ error: 'not_found' }, 404)`; else call `plaid.removeItem(item.accessToken)` (inside the same plaid-error try/catch as Task 4), then `obRepo.removeItem(itemId)`, respond `json({ ok: true })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/neo-bank/web/server/app.ts apps/neo-bank/web/server/app.test.ts
git commit -m "add Open Banking consent list and revoke endpoints"
```

---

## Task 6: Frontend — Connected banks UI (connect, view, disconnect)

**Files:**
- Modify: `apps/neo-bank/web/package.json` (add `react-plaid-link`)
- Modify: `apps/neo-bank/web/src/api.ts`
- Modify: `apps/neo-bank/web/src/App.tsx`
- Modify: `apps/neo-bank/web/src/locales/{en,zh,ja,ko}.json`
- Modify: `apps/neo-bank/web/src/app.test.tsx`

**Interfaces:**
- Consumes: `/api/plaid/link-token`, `/api/plaid/exchange`, `/api/open-banking/accounts`, `/api/open-banking/consents`, `/api/open-banking/consents/:itemId/revoke` (Tasks 4–5).
- Produces: `api.linkToken()`, `api.exchangePublicToken(publicToken)`, `api.linkedAccounts()`, `api.consents()`, `api.revokeConsent(itemId)` — consumed by Task 9's payment source picker.
  ```ts
  export type LinkedAccount = { accountId: string; itemId: string; name: string; mask: string; balanceCents: number }
  export type Consent = { itemId: string; institutionName: string; linkedAt: string }
  ```

- [ ] **Step 1: Add dependency**

Run: `cd apps/neo-bank/web && npm install react-plaid-link`

- [ ] **Step 2: Write a failing render test**

```ts
// app.test.tsx addition
it('shows a plaid_not_configured message instead of crashing', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/accounts') return { json: async () => accounts }
    if (url === '/api/open-banking/consents') return { json: async () => [] }
    if (url === '/api/plaid/link-token') return { ok: false, status: 503, json: async () => ({ error: 'plaid_not_configured' }) }
    return { json: async () => [] }
  }))
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Connect a bank' }))
  expect(await screen.findByText(/not configured/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run src/app.test.tsx`
Expected: FAIL — no "Connect a bank" button exists yet.

- [ ] **Step 4: Add API functions to `api.ts`**

`linkToken(): Promise<string>` (POST `/api/plaid/link-token`, throws the response's `error` field on non-ok, same pattern as `transfer`), `exchangePublicToken(publicToken: string): Promise<Consent>`, `linkedAccounts(): Promise<LinkedAccount[]>`, `consents(): Promise<Consent[]>`, `revokeConsent(itemId: string): Promise<void>`.

- [ ] **Step 5: Add the "Connected banks" section to `App.tsx`**

Fetch `consents()` and `linkedAccounts()` in `refresh()`. Add a "Connect a bank" button wired to `usePlaidLink` (request a link token on click, on `onSuccess(publicToken)` call `exchangePublicToken` then `refresh()`). If `linkToken()` rejects with `plaid_not_configured`, show a status message (e.g. `t('notConfigured')`) instead of opening Plaid Link. List each consent with a "Disconnect" button calling `revokeConsent(itemId)` then `refresh()`. List linked accounts (name, mask, balance) under their institution.

- [ ] **Step 6: Add i18n keys to all four locale files**

Add `connectBank`, `connectedBanks`, `disconnect`, `notConfigured`, `noLinkedBanks` with matching keys across `en.json`, `zh.json`, `ja.json`, `ko.json`.

- [ ] **Step 7: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run src/app.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/neo-bank/web/package.json apps/neo-bank/web/package-lock.json apps/neo-bank/web/src/api.ts apps/neo-bank/web/src/App.tsx apps/neo-bank/web/src/locales apps/neo-bank/web/src/app.test.tsx
git commit -m "add Connected banks UI: Plaid Link connect, view, disconnect"
```

---

## Task 7: Spending insights (pure logic + UI)

**Files:**
- Create: `apps/neo-bank/web/src/insights.ts`
- Create: `apps/neo-bank/web/src/insights.test.ts`
- Modify: `apps/neo-bank/web/src/App.tsx`
- Modify: `apps/neo-bank/web/src/api.ts` (add `openBankingTransactions()`)
- Modify: `apps/neo-bank/web/server/app.ts` + `server/app.test.ts` (add `GET /api/open-banking/transactions`)
- Modify: `apps/neo-bank/web/src/locales/{en,zh,ja,ko}.json`

**Interfaces:**
- Produces:
  ```ts
  export type InsightTx = { amountCents: number; category?: string; at: string }
  export function categoryBreakdown(txs: InsightTx[]): { category: string; totalCents: number }[]
  export function monthlyTotal(txs: InsightTx[], monthKey: string): number  // monthKey: 'YYYY-MM'
  export function roundUpTotal(txs: InsightTx[]): number
  ```

- [ ] **Step 1: Write failing tests for the pure functions**

```ts
// insights.test.ts
import { describe, expect, it } from 'vitest'
import { categoryBreakdown, monthlyTotal, roundUpTotal } from './insights.js'

describe('categoryBreakdown', () => {
  it('sums debit amounts per category, defaulting missing category to Uncategorized', () => {
    const txs = [{ amountCents: -650, category: 'Food', at: '2026-10-01' }, { amountCents: -350, at: '2026-10-02' }]
    expect(categoryBreakdown(txs)).toEqual(
      expect.arrayContaining([{ category: 'Food', totalCents: 650 }, { category: 'Uncategorized', totalCents: 350 }]),
    )
  })
  it('returns an empty array for no transactions', () => {
    expect(categoryBreakdown([])).toEqual([])
  })
})

describe('monthlyTotal', () => {
  it('sums debits within the given month', () => {
    const txs = [{ amountCents: -600, at: '2026-10-05T00:00:00Z' }, { amountCents: -100, at: '2026-09-05T00:00:00Z' }]
    expect(monthlyTotal(txs, '2026-10')).toBe(600)
  })
  it('returns 0 for no matching transactions', () => {
    expect(monthlyTotal([], '2026-10')).toBe(0)
  })
})

describe('roundUpTotal', () => {
  it('sums spare change to the next dollar across debits', () => {
    expect(roundUpTotal([{ amountCents: -650, at: 'x' }])).toBe(50)
  })
  it('returns 0 for no transactions', () => {
    expect(roundUpTotal([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run src/insights.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `insights.ts`**

`categoryBreakdown` groups by `category ?? 'Uncategorized'`, summing `Math.abs(amountCents)` for negative (debit) amounts only, skipping credits. `monthlyTotal` sums `Math.abs(amountCents)` for debits whose `at` starts with `monthKey`. `roundUpTotal` sums, per debit, `(100 - (Math.abs(amountCents) % 100)) % 100`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run src/insights.test.ts`
Expected: PASS

- [ ] **Step 5: Add `GET /api/open-banking/transactions` (backend) with its own failing test first**

```ts
it('merges plaid transactions with locally recorded payments, newest first', async () => {
  const obRepo = createMemoryOpenBankingRepo()
  obRepo.addItem({ itemId: 'item-1', accessToken: 'access-1', institutionName: 'Test Bank', linkedAt: 'now' })
  obRepo.recordPayment('acct-1', { id: 'local-1', accountId: 'acct-1', payee: 'Sam', memo: '', amountCents: -500, at: '2026-10-03T00:00:00Z', category: 'Transfer' })
  const app = buildApp(jsonRepo(), obRepo, fakePlaid({
    getTransactions: async () => [{ id: 'p1', accountId: 'acct-1', payee: 'Coffee', amountCents: -400, at: '2026-10-01T00:00:00Z', category: 'Food' }],
  }))
  const body = await (await get(app, '/api/open-banking/transactions')).json()
  expect(body.map((t: { id: string }) => t.id)).toEqual(['local-1', 'p1'])
})
```
Run it, confirm it fails, then implement: for each item, call `plaid.getTransactions(item.accessToken)` and `obRepo.localTransactions(accountId)` for each distinct `accountId` seen, concatenate, sort by `at` descending. Re-run to confirm it passes, then commit this backend slice separately:

```bash
git add apps/neo-bank/web/server/app.ts apps/neo-bank/web/server/app.test.ts
git commit -m "add aggregated open-banking transactions endpoint"
```

- [ ] **Step 6: Add `api.openBankingTransactions()` and the Insights section to `App.tsx`**

`api.openBankingTransactions(): Promise<InsightTx[]>` (GET `/api/open-banking/transactions`). In `App.tsx`, fetch this plus the already-loaded native `txs`, combine into `InsightTx[]` (native transactions get no `category`, which `categoryBreakdown` defaults to `'Uncategorized'`), and render an "Insights" section: category tiles, a round-up tile (`roundUpTotal`), and a current-month total (`monthlyTotal` with `new Date().toISOString().slice(0, 7)`). Render a zero-state message when the combined list is empty (Review Focus item).

- [ ] **Step 7: Add i18n keys** (`insights`, `roundUps`, `monthlyTotal`, `uncategorized`, `noActivity`) to all four locale files.

- [ ] **Step 8: Add a render test for the empty state**

```ts
it('shows a zero-state in Insights when there is no activity', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/accounts') return { json: async () => [] }
    if (url === '/api/open-banking/transactions') return { json: async () => [] }
    return { json: async () => [] }
  }))
  render(<App />)
  expect(await screen.findByText(/nothing here yet|no activity/i)).toBeInTheDocument()
})
```
Run it, confirm PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/neo-bank/web/src/insights.ts apps/neo-bank/web/src/insights.test.ts apps/neo-bank/web/src/api.ts apps/neo-bank/web/src/App.tsx apps/neo-bank/web/src/locales apps/neo-bank/web/src/app.test.tsx
git commit -m "add spending insights: category breakdown, round-ups, monthly total"
```

---

## Task 8: Backend — payment initiation from a linked account

**Files:**
- Modify: `apps/neo-bank/web/server/types.ts` (add `credit` to `BankRepo`)
- Modify: `apps/neo-bank/web/server/memoryRepo.ts`
- Modify: `apps/neo-bank/web/server/app.ts`
- Modify: `apps/neo-bank/web/server/app.test.ts`

**Interfaces:**
- Produces: `BankRepo.credit(accountId: number, payee: string, memo: string, amountCents: number): Transaction` (increments balance, records a positive-amount transaction); `POST /api/open-banking/pay` consumed by Task 9.

- [ ] **Step 1: Write a failing test for `BankRepo.credit`**

```ts
it('credit increases the balance and records a positive transaction', () => {
  const repo = createMemoryRepo()
  const before = repo.account(1)!.balanceCents
  const tx = repo.credit(1, 'Linked transfer', '', 1000)
  expect(repo.account(1)!.balanceCents).toBe(before + 1000)
  expect(tx.amountCents).toBe(1000)
})
```
Run: `npx vitest run server/app.test.ts` — expect FAIL (`credit` doesn't exist). Implement `credit` in `memoryRepo.ts` mirroring `debit`'s structure but adding instead of subtracting and keeping `amountCents` positive. Add the same test to `jsonRepo()`'s fixture-backed describe block and to `types.ts`'s `BankRepo` interface. Re-run to confirm PASS.

- [ ] **Step 2: Write failing tests for `POST /api/open-banking/pay`**

```ts
describe('open banking: payment initiation', () => {
  it('debits the linked account and credits the native account', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'access-1', institutionName: 'Test Bank', linkedAt: 'now' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    const res = await post(app, '/api/open-banking/pay', { itemId: 'item-1', accountId: 'acct-1', nativeAccountId: 1, payee: 'Rent', memo: '', amountCents: 3000 })
    expect(res.status).toBe(200)
    expect(obRepo.balanceOverride('acct-1')).toBe(-3000) // fakePlaid's acct-1 reports 10000; override tracks the delta applied
    const nativeAccounts = await (await get(app, '/api/accounts')).json()
    expect(nativeAccounts[0].balanceCents).toBe(10000 + 3000) // fixture starting balance (bank.json) + credited amount
  })

  it('rejects when the linked balance is insufficient', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'access-1', institutionName: 'Test Bank', linkedAt: 'now' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    const res = await post(app, '/api/open-banking/pay', { itemId: 'item-1', accountId: 'acct-1', nativeAccountId: 1, payee: 'Rent', memo: '', amountCents: 999999 })
    expect(res.status).toBe(422)
  })

  it('404s for an unknown or revoked itemId', async () => {
    const app = buildApp(jsonRepo(), createMemoryOpenBankingRepo(), fakePlaid())
    const res = await post(app, '/api/open-banking/pay', { itemId: 'missing', accountId: 'acct-1', nativeAccountId: 1, payee: 'Rent', memo: '', amountCents: 100 })
    expect(res.status).toBe(404)
  })

  it('validates payee and amount', async () => {
    const obRepo = createMemoryOpenBankingRepo()
    obRepo.addItem({ itemId: 'item-1', accessToken: 'access-1', institutionName: 'Test Bank', linkedAt: 'now' })
    const app = buildApp(jsonRepo(), obRepo, fakePlaid())
    expect((await post(app, '/api/open-banking/pay', { itemId: 'item-1', accountId: 'acct-1', nativeAccountId: 1, payee: '', amountCents: 100 })).status).toBe(400)
    expect((await post(app, '/api/open-banking/pay', { itemId: 'item-1', accountId: 'acct-1', nativeAccountId: 1, payee: 'x', amountCents: -1 })).status).toBe(400)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: FAIL — route doesn't exist.

- [ ] **Step 4: Implement `POST /api/open-banking/pay`**

Validate `payee` non-empty and `amountCents` a positive integer (400 otherwise, matching the existing `/api/transfers` validation style). Find the item by `itemId` in `obRepo.items()` (404 if missing). Fetch the account's current balance: call `plaid.getAccounts(item.accessToken)`, find the matching `accountId`, compute `currentBalance = plaidAccount.balanceCents + (obRepo.balanceOverride(accountId) ?? 0)`. If `currentBalance < amountCents`, return 422 `insufficient_funds`. Otherwise call `obRepo.recordPayment(accountId, { id: crypto.randomUUID(), accountId, payee, memo, amountCents: -amountCents, at: new Date().toISOString(), category: 'Transfer' })` and `bankRepo.credit(nativeAccountId, `Linked transfer: ${payee}`, memo, amountCents)`; respond `json({ ok: true })`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run server/app.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/neo-bank/web/server/types.ts apps/neo-bank/web/server/memoryRepo.ts apps/neo-bank/web/server/app.ts apps/neo-bank/web/server/app.test.ts
git commit -m "add payment initiation from a linked account"
```

---

## Task 9: Frontend — payment source picker (native vs. linked account)

**Files:**
- Modify: `apps/neo-bank/web/src/api.ts`
- Modify: `apps/neo-bank/web/src/App.tsx`
- Modify: `apps/neo-bank/web/src/app.test.tsx`
- Modify: `apps/neo-bank/web/src/locales/{en,zh,ja,ko}.json`
- Modify: `apps/neo-bank/web/e2e/flow.spec.ts` (new guarded spec file instead, see Step 5)

**Interfaces:**
- Consumes: `api.linkedAccounts()` (Task 6), `POST /api/open-banking/pay` (Task 8).
- Produces: `api.payFromLinkedAccount(itemId, accountId, nativeAccountId, payee, memo, amountCents): Promise<void>`.

- [ ] **Step 1: Write a failing test for picking a linked source**

```ts
it('pays from a linked account when selected as the source', async () => {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(url)
    if (url === '/api/accounts') return { json: async () => accounts }
    if (url === '/api/open-banking/consents') return { json: async () => [{ itemId: 'item-1', institutionName: 'Test Bank', linkedAt: 'now' }] }
    if (url === '/api/open-banking/accounts') return { json: async () => [{ accountId: 'acct-1', itemId: 'item-1', name: 'Checking', mask: '1111', balanceCents: 5000 }] }
    if (url === '/api/open-banking/pay') return { ok: true, json: async () => ({ ok: true }) }
    return { json: async () => [] }
  }))
  render(<App />)
  await userEvent.selectOptions(await screen.findByLabelText('Pay from'), 'Test Bank · Checking ·1111')
  await userEvent.type(screen.getByLabelText('To'), 'Sam')
  await userEvent.type(screen.getByLabelText('Amount (USD)'), '10.00')
  await userEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Sent!')
  expect(calls).toContain('/api/open-banking/pay')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/neo-bank/web && npx vitest run src/app.test.tsx`
Expected: FAIL — no "Pay from" source picker exists yet.

- [ ] **Step 3: Add `api.payFromLinkedAccount`**

```ts
payFromLinkedAccount: (itemId: string, accountId: string, nativeAccountId: number, payee: string, memo: string, amountCents: number) => Promise<void>
```
POSTs to `/api/open-banking/pay`, throws the response's `error` on non-ok (same pattern as `transfer`).

- [ ] **Step 4: Add the source picker to the existing Pay form in `App.tsx`**

Add a `<select aria-label={t('payFrom')}>` with the native selected account as the default option plus one option per linked account (value encodes `itemId`/`accountId`). On submit, if a linked account is selected, call `payFromLinkedAccount` instead of `transfer`; on success, `refresh()` both native accounts and linked accounts/consents so balances update everywhere. Map a 422 from the linked path to the same `t('insufficient')` message used today. If the selected linked source has since been revoked (Review Focus item — stale selection), treat the resulting 404 the same as `t('invalid')` and reset the picker to the native default.

- [ ] **Step 5: Add i18n key `payFrom`** to all four locale files.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/neo-bank/web && npx vitest run src/app.test.tsx`
Expected: PASS

- [ ] **Step 7: Add a sandbox-gated e2e spec**

Create `apps/neo-bank/web/e2e/open-banking.spec.ts`:
```ts
import { expect, test } from '@playwright/test'

test.skip(!process.env.PLAID_CLIENT_ID, 'requires PLAID_CLIENT_ID/PLAID_SECRET sandbox credentials')

test('connect a sandbox bank, pay from it, then disconnect', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Connect a bank' }).click()
  // Plaid Link sandbox flow: search any institution, then user_good / pass_good
  const plaidFrame = page.frameLocator('iframe[title="Plaid Link"]')
  await plaidFrame.getByPlaceholder(/search/i).fill('Platypus')
  await plaidFrame.getByText('Platypus Bank').click()
  await plaidFrame.getByLabel(/username/i).fill('user_good')
  await plaidFrame.getByLabel(/password/i).fill('pass_good')
  await plaidFrame.getByRole('button', { name: /submit|continue/i }).click()
  await expect(page.getByText('Platypus Bank')).toBeVisible()
  await page.getByLabel('Pay from').selectOption({ label: /Platypus Bank/ })
  await page.getByLabel('To').fill('Sam')
  await page.getByLabel('Amount (USD)').fill('5.00')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Sent!')
  await page.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByText('Platypus Bank')).not.toBeVisible()
})
```
This is illustrative scaffolding for real sandbox selectors — the implementer should run it once with real credentials and adjust the Plaid Link iframe selectors to match Plaid's actual sandbox UI, since that UI is outside this repo's control.

- [ ] **Step 8: Commit**

```bash
git add apps/neo-bank/web/src/api.ts apps/neo-bank/web/src/App.tsx apps/neo-bank/web/src/app.test.tsx apps/neo-bank/web/src/locales apps/neo-bank/web/e2e/open-banking.spec.ts
git commit -m "add payment source picker for linked accounts"
```

---

## Self-Review Notes

- **Spec coverage:** visual redesign (Task 1), account aggregation (Tasks 4, 6), payment initiation (Tasks 8, 9), spending insights (Task 7), consent management (Tasks 5, 6) are each covered by a task. Credentials/env-var wiring is covered in Task 2 (`isPlaidConfigured`) and Task 4 (wiring in the Netlify function).
- **Type consistency:** `PlaidClient`, `PlaidAccount`, `PlaidTransactionRecord` (Task 2); `PlaidItem`, `LinkedTransaction`, `OpenBankingRepo` (Task 3); `buildApp(bankRepo, obRepo, plaid)` (Task 4) are used identically by every later task that references them.
- **Review Focus coverage:** not-configured messaging (Task 6 Step 2), double-revoke 404 (Task 5 Step 1), compounding balance overrides (Task 3 Step 1 + Task 8 Step 2), empty-state insights (Task 7 Step 8), stale payment-source selection after revoke (Task 9 Step 4) are each pinned to a concrete test.
