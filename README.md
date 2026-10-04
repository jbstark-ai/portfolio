# Jay — freelance developer portfolio

**Live site: <https://jbstark-portfolio.netlify.app>**

A static React + Vite + TypeScript single-page site showcasing the apps in [`apps/`](./apps).

```bash
npm i
npm run dev      # local dev server
npm run build    # static output in dist/ (relative base, host anywhere)
```

Edit `src/profile.ts` to change copy, links or to add a contact email.
App screenshots live in `public/screens/`. See [`apps/README.md`](./apps/README.md) to run the demo apps.

## Deployment

The wrapper and each demo app are separate Netlify sites built from this repo. Every push to `main` redeploys them.

| Site | Base directory | URL |
|---|---|---|
| Portfolio (wrapper) | `/` | <https://jbstark-portfolio.netlify.app> |
| Airline | `apps/china-airlines` | <https://jbstark-airline.netlify.app> |
| Patron | `apps/art-patron/web` | <https://jbstark-patron.netlify.app> |
| Crypto Store | `apps/crypto-store/web` | <https://jbstark-cryptostore.netlify.app> |
| STARK | `apps/neo-bank/web` | <https://jbstark-bank.netlify.app> |

Build settings live in each base directory's `netlify.toml`.
