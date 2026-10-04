# wiskr
Naming a startup is hard. Finding out it's taken is worse. One search, and Wiskr tells you if it's yours.

## Run

Vite + TypeScript, no framework.

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then build to dist/
npm run preview    # serve the production build
```

Results are linkable: `/?q=Lumora`. So are name ideas: `/?ideas=payments&style=borrowed`.

## Structure

- `index.html` — markup
- `src/main.ts` — routing, search flow, events
- `src/checks.ts` — the four checks: fetch, summary, detail markup
- `src/views.ts` — scanning view and final report
- `src/ideas.ts` — name ideas: style picker and pre-checked suggestions
- `src/eyes.ts` — the cat eyes
- `src/api.ts` — data layer: one async function per check (trademarks, domains, socials, google), plus `suggest`
- `src/mock.ts`, `src/mock-names.ts` — deterministic mock data behind `api.ts`
- `src/types.ts` — data shapes

All data is currently mocked. To go live, replace the function bodies in `src/api.ts` with real requests that return the same types.

## Branches

Work lands on `dev`. `main` is protected and only changes through pull requests.
