# Architecture

This document explains how Sniper Fishing is put together, the contracts
between modules, and the invariants that keep the app honest.

## High-level data flow

```
 Browser
  │
  ├─ SettingsProvider (lib/hooks/use-settings.tsx)
  │     └─ lib/persistence/repositories.ts  → IndexedDB (+ localStorage mirror)
  │
  ├─ useForecast(location)  (lib/hooks/use-forecast.ts)
  │     └─ lib/providers/index.ts  fetchMergedForecast()
  │          ├─ open-meteo/marine.ts     (waves, swell, SST, current, sea level)
  │          ├─ open-meteo/forecast.ts   (wind, gusts, weather, precip, sun)
  │          ├─ providers/merge.ts       (align hourly series, build snapshots)
  │          └─ providers/http.ts        (fetch w/ timeout, retry, TTL cache,
  │                                        stale-while-error, Zod validation)
  │
  ├─ Scoring (pure, deterministic, no I/O)
  │     ├─ lib/scoring/normalize.ts  (raw values → 0..1 per method profile)
  │     ├─ lib/scoring/engine.ts     (0..100 score + per-factor reasons + completeness)
  │     └─ lib/scoring/windows.ts    (best estimated windows)
  │
  └─ Safety (independent of score)
        └─ lib/safety/assess.ts      (Favorable/Caution/Unfavorable/Dangerous/
                                      Insufficient — never overridden by score)
```

Everything that touches the network lives behind `lib/providers`. Everything
that turns data into a number or a safety status is a **pure function** in
`lib/scoring` / `lib/safety` with no side effects and no I/O — which is what
makes them deterministic and unit-testable.

## Providers (`lib/providers`)

Each provider is an adapter that:
- builds a request against a public, key-less endpoint,
- fetches with a shared HTTP helper,
- validates the raw response with a **Zod** schema (`lib/validation/schemas.ts`),
- maps it into an internal, unit-consistent model (`lib/models/types.ts`),
- and carries `ProviderMetadata` (provider name, endpoint, license,
  attribution) so the UI can always show source + license + age.

`lib/providers/http.ts` is the only place that does fetch. It provides:
- per-request **timeout**,
- bounded **retry**,
- an in-memory **TTL cache** with **stale-while-error** (if a refresh fails but
  we have a cached value, we serve it and flag it stale),
- and a `fromCache` flag so the UI can label cached data with its age.

`providers/merge.ts` aligns the marine and weather hourly series into a single
`MergedForecast` with per-hour `ConditionSnapshot`s (including a
`dataCompleteness` 0..1 and a `missing[]` list) and a `sunriseByDate` map.

**Missing data policy:** a `null` is always a `null`. Nothing is filled with a
guess. `merge` records which key variables are missing at each hour; scoring
penalizes completeness accordingly.

### Tides & warnings (deliberately conservative)
- `providers/tides.ts` — there is **no authoritative local tide table**
  integrated. Open-Meteo's `sea_level_height_msl` is surfaced only as a *model
  estimate* and the UI says exactly that. No tide heights are presented as a
  nautical almanac.
- `providers/warnings.ts` — a slot for official warnings. Until a reliable,
  officially-sourced feed exists, the app distinguishes **official** vs
  **app-generated** warnings in the UI and does not invent official alerts.

## Scoring (`lib/scoring`) — transparent, deterministic

`lib/models/profiles.ts` defines a **profile per fishing method** (surfcasting,
shore spinning, harbor, rock, float, boat, kayak): for each factor, the
preferred range and a weight. Moroccan Atlantic/Mediterranean presets are
labelled in-app as **initial heuristics**.

The pipeline:
1. **Normalize** (`normalize.ts`) — each raw factor value is mapped to a 0..1
   "how favorable" score using the method's profile (piecewise, documented).
   Missing/stale data → low completeness, never a fabricated value.
2. **Score** (`engine.ts`) — weighted combination → clamped 0..100, plus:
   - a per-factor `explanationKey` and measured value (so the UI can explain
     every contribution),
   - a `confidenceFactor` that reduces the score when data is stale,
   - a separate `completeness` (0..1) that is reported **independently** of the
     score.
3. **Windows** (`windows.ts`) — finds the best estimated time windows and the
   reasons for them.

The engine is pure: same inputs → same outputs. This is asserted by unit tests
(`tests/unit/scoring.test.ts`, `normalize.test.ts`).

**Honesty invariants enforced here and in tests:**
- A missing value lowers completeness and the score; it is never assumed.
- Stale data reduces confidence.
- There is no path from "score" to "you will catch fish" — no catch
  guarantee, no scientific-validation claim.

## Safety (`lib/safety`)

`assess.ts` takes the session's hourly conditions + method + any warnings and
produces a status from:
`Favorable | Caution | Unfavorable | Dangerous | InsufficientData`, plus
human-readable alerts (app-generated and, when available, official) and an
advice line.

It uses **conservative, configurable thresholds** that are intentionally
stricter than the scoring preferences. The status is computed **independently**
of the suitability score; a 99/100 score next to a `Dangerous` safety status is
a valid and correct output. The UI renders them in separate sections and keeps
the do-not-go message full-strength in every locale.

## i18n & RTL (`i18n/`, `messages/`, `lib/i18n`)

- Four **complete** locales: `ary` (Moroccan Darija — the default for
  first-time users; documented as a project-defined dialect variant), `ar`
  (Modern Standard Arabic), `fr`, `en`. `en` is the canonical/authoritative
  message file; the others must stay in sync (enforced by unit tests that check
  key parity across namespaces).
- `i18n/routing.ts` + `middleware.ts` handle locale negotiation and the
  `always` locale prefix. **Browser language detection may suggest but never
  override** the user's saved choice; the onboarding screen is the source of
  truth for first-time users.
- `lib/i18n/format.ts` provides locale-aware number, date, time and **unit**
  formatting (so km vs mi, °C vs °F, knots vs km/h render correctly).
- `ary`/`ar` are **RTL**. The layout uses logical CSS properties
  (`ms-`/`me-`, `start`/`end`), mirrors navigation, but keeps numeric values,
  units and charts legible (wrapped in `ltr` where needed). An Arabic font is
  bundled.

## Persistence (`lib/persistence`)

- `db.ts` — a thin IndexedDB wrapper (opens the DB, handles a graceful
  in-memory fallback when IndexedDB is unavailable).
- `repositories.ts` — typed access for `settings`, `spots`, `sessions`.
  Settings additionally keep a **synchronous localStorage mirror**
  (`sf:settings`) so a locale switch (which does a full document swap) never
  reads pre-write state; the mirror is validated with Zod on read.
- `export.ts` — JSON and CSV export/import for spots and sessions, with Zod
  validation on import (an invalid file is rejected, never partially applied).

Data model (`lib/models/types.ts`) includes `DEFAULT_SETTINGS` (language
`ary`, onboarding not done, etc.) and the `Spot`, `FishingSession`,
`CatchEntry`, `ConditionSnapshot` and forecast shapes.

## Optional cloud sync (`lib/supabase`, `supabase/`)

`lib/supabase/client.ts` returns a client **only** when
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set; otherwise
the Settings UI hides the account section and the app runs fully local.
`supabase/migrations/0001_init.sql` defines the `spots` and `sessions` tables
with **row level security** so a user can only touch their own rows
(`user_id = auth.email()`). Sync is a manual "Sync now" action that upserts the
user's local rows; the service-role key is never shipped to the browser.

## PWA / offline (`public/`, service worker)

A production build registers `sw.js`, ships `manifest.webmanifest` and app
icons. The offline shell lets the app open without network; cached forecasts
are labelled with their age, and the app never claims offline data is live.

## Testing

- `tests/unit/` (Vitest) — provider parsing + network behavior, missing/invalid
  data, unit conversions, wind direction, score calculation, safety overrides,
  method profiles, timezone handling, storage, CSV/JSON export, merge,
  normalization, analytics, and i18n key parity.
- `tests/e2e/` (Playwright) — ten real flows against a production build:
  onboarding, live dashboard forecast, geocoded location pick, forecast page,
  method change, create spot, create session, trip planner, reload
  persistence, and a full provider-failure degradation check.

## Key files
- `lib/scoring/engine.ts`, `lib/scoring/normalize.ts`, `lib/models/profiles.ts`
- `lib/safety/assess.ts`
- `lib/providers/merge.ts`, `lib/providers/http.ts`, `lib/validation/schemas.ts`
- `lib/persistence/repositories.ts`, `lib/hooks/use-settings.tsx`
- `i18n/routing.ts`, `messages/*.json`, `lib/i18n/format.ts`
- `app/[locale]/{page,forecast,map,spots,planner,logbook,settings,welcome}`
- `supabase/migrations/0001_init.sql`
