# STARK (neo-bank): Starling/TD-fused redesign + mocked-via-sandbox Open Banking

## Context

STARK (`apps/neo-bank/web`) is a portfolio demo bank app: an account switcher, a send-money form, and a transaction list, backed by an in-memory repo served through a Netlify Function (`server/app.ts`, `server/memoryRepo.ts`). It currently uses a "Polestar-style" green/slate palette with polaroid-photo account cards (added in commit `85727c7`).

Goal: fuse the current green/slate palette with Starling Bank's UI patterns and TD Bank's brand/structure cues, and add a real Open Banking-style account-aggregation feature backed by Plaid's sandbox environment (not a purely local mock), covering account aggregation, payment initiation, spending insights, and consent management.

## Visual direction

- Drop the polaroid/photo account cards entirely.
- Bold, card-based account UI (Starling pattern): large balance figures, rounded account cards in a horizontal stack.
- Categorized/iconized transaction rows instead of plain list items.
- Section structure echoing TD's online banking: Accounts / Pay / Insights / Connected banks.
- Palette: existing green (overlaps with TD's brand green) as primary, slate for text/surfaces, one warm accent color for alerts and spending categories. No purple/coral (avoids a literal Starling clone).

## Feature scope (Open Banking, via Plaid sandbox)

1. **Account aggregation** — real Plaid Link consent flow; linked external accounts and their sandbox balances/transactions are fetched from Plaid and shown alongside native STARK accounts.
2. **Payment initiation** — initiate a transfer sourced from a linked external account.
3. **Spending insights / categorization** — category breakdown, monthly summary, and a round-up estimate, computed from native + aggregated transactions.
4. **Consent management** — list connected institutions with linked date and shared accounts; revoke access per institution.

## Architecture

### Frontend
- New "Connect a bank" entry point launches Plaid Link (`react-plaid-link`) using a link token obtained from the backend.
- On success, the public token is exchanged server-side; the linked institution then appears under a new "Connected banks" section.
- New "Insights" view and "Connected banks" (consent) view added alongside the existing accounts/send/history sections.

### Backend
Extends the existing fetch-style router in `server/app.ts` (same pattern as today — no framework change) with:

- `POST /api/plaid/link-token` — creates a link token (Plaid `/link/token/create`)
- `POST /api/plaid/exchange` — exchanges `public_token` for an `access_token`, stores the item, fetches initial accounts
- `GET /api/open-banking/accounts` — linked external accounts + live sandbox balances
- `GET /api/open-banking/transactions` — aggregated transactions with Plaid's categories
- `GET /api/open-banking/consents` — linked institutions/items with linked date + granted scopes
- `POST /api/open-banking/consents/:itemId/revoke` — calls Plaid `/item/remove`, then drops the item locally
- `POST /api/open-banking/pay` — payment initiation (see below)

### Storage
Plaid items/access tokens are held in the same module-level in-memory store as the existing accounts/transactions (`memoryRepo.ts` pattern), with the same documented caveat: state resets on cold start. Acceptable because this is sandbox-only data with no real financial or security exposure.

### Credentials
`PLAID_CLIENT_ID` / `PLAID_SECRET` (sandbox environment) are read from Netlify environment variables via `process.env`. Never committed. The user adds these via the Netlify dashboard before the feature can authenticate against real Plaid sandbox infrastructure; until then, the UI should surface a clear "not configured" state rather than failing silently.

## Payment initiation — design compromise

Plaid's real Payment Initiation (PIS) product is UK/EU-only and gated behind production approval even in sandbox, so a literal "send money via Plaid" call isn't available. Instead:

- The **source account and its balance are real Plaid sandbox data** (fetched live via account aggregation).
- The **money movement is a local ledger operation**: debit the cached external-account balance, credit the STARK native account, write a transaction row on both sides.
- The UI clearly labels this as a linked-account transfer, consistent with how the existing native "send money" flow already works (no real money ever moves in this demo).

## Spending insights

- Group native + aggregated transactions by Plaid's returned category.
- Show a monthly total and a simple per-category breakdown (plain bars/tiles — no charting library, keeps bundle small).
- Naive round-up estimate: sum of "spare change" (amount rounded up to the nearest dollar/pound minus actual amount) across debit transactions, styled as a Starling-style "round-ups" tile.

## Consent management UI

- Lists each connected institution: name, linked date, accounts shared.
- "Disconnect" button calls the revoke endpoint; institution is removed from the UI immediately on success.

## Testing

- Unit tests for new route handlers mirroring the existing `server/app.test.ts` pattern, with Plaid API calls mocked at the fetch/SDK boundary.
- Playwright e2e extended to cover: connect a bank → view aggregated accounts → simulate a linked-account payment → disconnect, using Plaid's sandbox test credentials (`user_good`/`pass_good`).
- E2E Plaid-dependent tests run against real sandbox infra only when `PLAID_CLIENT_ID`/`PLAID_SECRET` are present in the environment; otherwise skipped (not failed), since those are secrets the user provisions personally.

## Suggested implementation sequence

1. Visual redesign (palette, card layout, drop photos) — no backend changes.
2. Account aggregation + consent screen (Plaid Link, link-token/exchange, accounts/consents endpoints + revoke).
3. Spending insights (category breakdown, round-ups, monthly summary).
4. Payment initiation (linked-account transfer flow).

## Out of scope

- Real movement of funds (impossible and undesired in a sandbox/demo).
- Production Plaid approval / non-sandbox environments.
- Any Open Banking regulatory compliance (PSD2/FCA) work — this is a portfolio demo, not a regulated product.
