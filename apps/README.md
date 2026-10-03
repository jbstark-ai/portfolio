# Portfolio

Here are some showcase apps built in Node/Go and React. Fully unit & E2E -tested.

| App | Frontend | Backend | How to run teh app locally |
|---|---|---|---|
| [airline](./china-airlines) – Airline concept modernized for quick answers | Vite + TanStack Router/Query | Node.js (Fastify, TS) + SQLite | `npm i && npm run dev` opens on PORT :5173 |
| [patron](./art-patron) – Swipe to back creators (people with many disciplines); responsive, follows OS dark/light | Vite + React | Go (`net/http`) + SQLite, single binary | `cd server && go run .` (:8081), `cd web && npm i && npm run dev` opens on PORT :5174 |
| [cryptostore](./crypto-store) – Web3 supermarket | Vite + TanStack Router/Query | .NET 10 minimal API + SQLite | `dotnet run --project api --urls http://localhost:5080`, `cd web && npm i && npm run dev` opens on PORT :5175 |
| [STARK](./neo-bank) – Polaroid × IBM challenger bank | Vite + React | Node.js (Fastify, TS) + SQLite | `cd server && npm i && npm start` (:3002), `cd web && npm i && npm run dev` opens on PORT :5176 |

## Tests

- Unit: `npm test` (frontends, china-airlines incl. API), `go test ./...` in `art-patron/server`, `dotnet test` in `crypto-store/api.tests`, `npm test` in `neo-bank/server`.
- E2E: `npx playwright install chromium` once, then `npm run test:e2e` in each frontend folder (it boots the backend automatically).



