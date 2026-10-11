# Setup & Troubleshooting

This is the practical guide: getting a clean local run, enabling optional
cloud sync, and fixing the problems you're most likely to hit.

## Requirements
- **Node.js ≥ 18.17** (the project is developed on Node 20).
- **npm** (a lockfile is committed, so use `npm ci` for reproducible installs).
- **No API keys.** The core app uses free, key-less public endpoints
  (Open-Meteo, BigDataCloud geocoding).

## Clean local run

```bash
git clone <repo-url> sniper-fishing
cd sniper-fishing
npm ci                 # exact locked dependency set

npm run dev            # → http://localhost:3000  (development)
```

Production:
```bash
npm run build
npm start              # → http://localhost:3000
```

First launch shows the language onboarding screen (default locale: Moroccan
Darija). Choose your language; it is stored on the device.

## Tests

```bash
npm test               # unit tests (Vitest)
npm run typecheck      # strict TypeScript
npm run lint           # ESLint
npm run check          # lint + typecheck + unit together
npm run test:e2e       # Playwright (starts a prod build on :3111)
```

The e2e suite uses the **live** Open-Meteo APIs. If your network can't reach
them, the "dashboard renders a real live forecast" spec will fail — that is a
network limitation, not an app bug. The dedicated *provider-failure* spec, by
contrast, **must** pass even with no network to those hosts (it intercepts and
aborts them).

## Optional: enable Supabase cloud sync

1. Create a Supabase project.
2. Run the migration so the sync tables + RLS exist:
   ```
   supabase db push          # or run supabase/migrations/0001_init.sql
   ```
3. Set the project URL + **anon** key locally (never commit them):
   ```bash
   cp .env.example .env.local
   # fill in:
   #   NEXT_PUBLIC_SUPABASE_URL=
   #   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
4. Restart. Settings → Account now shows sign-in.

> Only the **anon** key belongs in `NEXT_PUBLIC_*`. The **service-role** key
> must never be in a `NEXT_PUBLIC_` variable or in the browser bundle. Row
> level security (see `supabase/migrations/0001_init.sql`) is what makes
> anon-key access safe — a signed-out client cannot read, write or enumerate
> any rows.

## Troubleshooting

### "Could not load data from the provider" / "Network error"
- You're offline, or the free Open-Meteo endpoints are unreachable/rate-limited
  from your network (non-commercial, <10k calls/day). Hit **Retry**.
- If you see "Showing last cached data (… old)", the app served its TTL cache
  because a refresh failed — that's the stale-while-error behavior, and the
  age is shown honestly.

### Fresh guest keeps landing on the language screen
That's correct: a fresh browser (no IndexedDB) runs onboarding exactly once.
The choice is then persisted. If it *loops* (welcome → dashboard → welcome),
clear site data and re-run onboarding; if it persists, open a bug report with
the browser console output.

### Score is missing / shows "Some data are missing…"
At least one key variable is absent for that hour (e.g. a provider field was
null). The app **penalizes** the score and tells you which factors are missing
instead of inventing values. This is intentional — see the "Honesty" section of
`docs/ARCHITECTURE.md`.

### Sunrise/sunset shows "Not available"
The weather provider did not return a daily sunrise/sunset for that date (can
happen at the very edge of the forecast window). The app shows "Not available"
rather than guessing.

### Map tiles are blank
- Offline: tiles can't load (the map shell still works; no fake tiles).
- Tiles are © OpenStreetMap contributors (ODbL) — attribution is shown by
  Leaflet.

### Port already in use (e2e / start)
- e2e serves on **3111**. If something else is on it, stop it or change
  `playwright.config.ts` → `webServer.port`.
- `npm start` uses 3000 (or `$PORT`).

### "next: not found" / modules missing after clone
Run `npm ci` first (not `npm install` if you want the locked set). Ensure Node
≥ 18.17 (`node --version`).

### TypeScript strict errors when extending
The project is `strict: true`. Don't add `any` or `@ts-ignore` to silence
errors — model the data properly (see `lib/models/types.ts` and
`lib/validation/schemas.ts`).

## Ports at a glance
| Purpose        | Port |
|----------------|------|
| `npm run dev`  | 3000 |
| `npm start`    | 3000 (or `$PORT`) |
| e2e webServer  | 3111 |

## Data & privacy
All guest data lives in your browser's IndexedDB (plus a small localStorage
settings mirror). Nothing is sent to a server unless you opt into an account.
Export everything (JSON) from Settings before clearing site data.
