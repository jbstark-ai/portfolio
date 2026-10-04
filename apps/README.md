# Portfolio

Here are some showcase apps built in TypeScript and React, with serverless APIs on Netlify Functions. Fully unit & E2E tested.

| App | Frontend | Backend | Run locally |
|---|---|---|---|
| [airline](./china-airlines) – Airline concept modernized for quick answers · [live](https://jbstark-airline.netlify.app) | Vite + TanStack Router/Query | Netlify Function (TypeScript) | `npm i && npm run dev` opens on port :5173 |
| [patron](./art-patron) – Swipe to back creators (people with many disciplines); responsive, follows OS dark/light · [live](https://jbstark-patron.netlify.app) | Vite + React | Netlify Function (TypeScript) | `cd web && npm i && npm run dev` opens on port :5174 |
| [cryptostore](./crypto-store) – Web3 supermarket · [live](https://jbstark-cryptostore.netlify.app) | Vite + TanStack Router/Query | Netlify Function (TypeScript) | `cd web && npm i && npm run dev` opens on port :5175 |
| [STARK](./neo-bank) – Polaroid × IBM challenger bank · [live](https://jbstark-bank.netlify.app) | Vite + React | Netlify Function (TypeScript) | `cd web && npm i && npm run dev` opens on port :5176 |

## How the APIs work

Each app's API is a single Netlify Function at `netlify/functions/api.ts`, mounted at `/api/*`. The routing and validation live in `server/app.ts` as a plain `(Request) => Response` handler. In development, Vite serves the same handler (`server/devApi.ts`), so `npm run dev` runs the whole app with no separate backend process.

Data is held in memory and seeded on start (`server/memoryRepo.ts`). Changes such as swipes, orders and transfers last as long as the function instance and reset on a cold start, which keeps the public demos fresh.

## Tests

- Unit: `npm test` in each app folder (`china-airlines`, or `web/` for the others). This covers the UI and the API handler, with the API tested against JSON fixtures in `test/fixtures/`.
- E2E: `npx playwright install chromium` once, then `npm run test:e2e` in the same folder. It starts the Vite dev server, which also serves the API.

Image attributions: see [CREDITS.md](./CREDITS.md).
