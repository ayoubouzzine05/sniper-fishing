# Implementation Status

_Last verified: **2026-10-11** (all results below were actually executed in
this workspace, not assumed)._

## How to read this

- **Done & verified** — implemented and proven by executed tests or a live
  manual check, with the result recorded.
- **Done, not externally verifiable** — implemented correctly per its spec but
  could not be exercised end-to-end here (e.g. needs credentials).
- **Limited** — works, but with an explicitly stated limitation.
- **Not done** — missing on purpose or deferred. Nothing here is claimed that
  wasn't built.

## 1. Core product — Done & verified

| Area | Status | Evidence |
|---|---|---|
| Marine dashboard (current conditions, 24h strip, 48h chart, score, safety, session window) | ✅ | E2E spec 02 (live Open-Meteo data) |
| Real provider integration (Open-Meteo Marine + Forecast, key-less) | ✅ | E2E specs 02–05, 07–08 render live values; unit tests for parsing/network |
| Geocoding search + map pick (Leaflet/OSM) | ✅ | E2E spec 03 (real geocode of Essaouira) |
| Forecast page (method, preset, date, window, gauge, breakdown, windows, attribution) | ✅ | E2E spec 04 |
| Method change re-renders assessment | ✅ | E2E spec 05 |
| Fishing spots CRUD + privacy (private notes hidden from list) + photos + export/import | ✅ | E2E spec 06 (incl. photo upload); unit tests (export, storage) |
| Catch logbook (sessions, catches, catch + session photos ≤500KB, conditions snapshot, zero-catch) | ✅ | E2E spec 07 (incl. session photo); unit tests (analytics) |
| Trip planner (localized report, hourly table, windows, warnings/data gaps, JSON export, print) | ✅ | E2E spec 08 |
| Persistence across reloads (guest, no account), incl. spot photos | ✅ | E2E spec 09; unit tests (storage incl. settings fast-path, photo round-trips) |
| Provider failure → useful error + retry, no fake data, no score invented | ✅ | E2E spec 10 (network aborted); unit tests (missing/invalid) |
| Transparent 0–100 scoring per method + per-factor explanation + separate completeness | ✅ | Unit tests (scoring, normalize); E2E 02/04 |
| Independent safety assessment, never overridden by score | ✅ | Unit tests (safety, incl. overrides) |
| 4 complete locales (ary default, ar, fr, en), RTL, locale-aware units/dates | ✅ | Unit tests (i18n key parity); RTL render in E2E 01 |
| Onboarding (first launch, default ary, persisted, never overridden by browser detection) | ✅ | E2E spec 01 |
| PWA (manifest, icons, service worker, offline shell, cached-forecast age labels) | ✅ (build) | `public/sw.js`, `manifest.webmanifest`, icons; conservative caching strategy |
| Guest mode with no account; local-only storage | ✅ | E2E 06/07/09; no network dependency for core |
| Unit tests | ✅ **109/109 passed** (12 files) | `npx vitest run`, 2026-10-12 |
| E2E tests | ✅ **10/10 passed** | `npx playwright test`, 2026-10-12 |
| Lint / typecheck / build | ✅ clean | `npm run check` + `npm run build` |

## 2. Optional cloud sync (Supabase) — Done, not externally verifiable

- `lib/supabase/client.ts` — client only when `NEXT_PUBLIC_SUPABASE_URL` +
  anon key are set; UI hides the account section otherwise. ✅ (code)
- `supabase/migrations/0001_init.sql` — `spots` + `sessions` tables with
  **row level security** (`user_id = auth.email()`), no anon read policies. ✅ (written)
- Settings → Account: sign in/up/out + manual "Sync now" (upsert, mapped
  camelCase→snake_case, `onConflict [user_id, id]`). ✅ (code)
- **Not verified against a live Supabase project** — no credentials exist in
  this build environment, and the master rule is to never claim an unrun
  integration. Treat cloud sync as *implemented, awaiting a real project to
  exercise*. No service-role key is ever shipped to the browser.

## 3. Data honesty & scope — Limited by design

- **Tides:** no authoritative local tide table exists in this build.
  `sea_level_height_msl` is shown only as a *model estimate* with an explicit
  disclaimer. No tide heights are presented as a nautical almanac. (Deliberate
  honesty; see `lib/providers/tides.ts`.)
- **Official warnings:** `lib/providers/warnings.ts` is a slot. Until a
  reliable, officially-sourced feed is integrated, the app distinguishes
  **official** vs **app-generated** warnings in the UI and does not invent
  official alerts. No live official-warning feed is wired up.
- **Species knowledge base:** `lib/species/data.ts` ships names (en/fr/ar/ary),
  scientific names, habitat, methods, general (non-local) seasonality, and
  regulation entries **intentionally marked `unverified`** with a link to the
  authoritative Moroccan source (DPM) — because the per-species arrêtés could
  not be verified from this environment (last attempt 2026-10-11). The data
  module is complete, but **it is not yet surfaced in the UI** (no species
  reference page or form autocomplete) — see "Not done".
- **Coastal presets:** Moroccan Atlantic/Mediterranean presets are labelled in
  app as **initial heuristics**, not validated science. Other regions fall back
  to a "Generic" preset.
- **Currents/waves/SST:** Open-Meteo coastal model, ~8 km resolution — good
  for planning, not for navigation. Stated in-app.
- **No catch guarantee, no "scientifically validated" claim** — enforced in
  copy across all four locales and in CONTRIBUTING ground rules.

## 4. Not done (explicit)

- Species reference UI / autocomplete (data exists, no page) — next up.
- Live official warnings feed.
- Cloud **pull**/merge (currently manual push sync only); no cross-device
  conflict resolution yet.
- Photo storage is local-only (data URL, ≤500 KB); not synced to cloud.
- No server-side accounts for the core product (by design: guest-first).
- Deeper logbook analytics (e.g. longer-horizon correlation views) — the base
  analytics exist with a correlation-≠-causation disclaimer.

## 5. Prioritized future work

1. **Species UI** — a reference page + spot/session form autocomplete, using
   the existing (honest, `unverified`-flagged) data.
2. **Official warnings integration** — once a reliable, attributed feed is
   identified; keep the official/app-generated distinction.
3. **Cloud sync hardening** — pull + merge, last-writer-wins or field-level
   conflict handling, tests against a real Supabase project.
4. **Regional preset expansion** — more coasts, calibrated from user feedback
   (still labelled heuristics until evidence says otherwise).
5. **Tide source** — if/when an authoritative, open tide table becomes
   available for Moroccan ports; replace the model-estimate disclaimer.
6. **i18n native review pass** for `ar`/`ary` (safety-urgency check in all
   locales).
7. **Performance & caching** — edge/provider caching, bundle audit.
8. **Accessibility audit** — screen-reader pass on the gauge, charts, map and
   RTL flows.

## 6. License note (MIT vs AGPL-3.0)

We chose **MIT** (see `LICENSE`). Rationale: Sniper Fishing is a free-data,
open tool meant to be adopted and integrated (e.g. into other fishing or
maritime projects). MIT maximizes that adoption with no copyleft obligation on
integrators, while AGPL-3.0 would require any network-served modification to
release source — a barrier for a utility like this. The data licenses you are
already bound by (Open-Meteo CC BY 4.0 non-commercial; OSM ODbL) are credited
in-app regardless of the code license. If you prefer a copyleft release, the
code is permissive enough that relicensing is a maintainer decision, not a
technical one.

## 7. Reproducing the recorded results

```bash
npm ci
npm run check          # lint + typecheck + 107 unit tests
npm run build
npm run test:e2e       # 10 Playwright flows against a prod build + live APIs
```

Results as of 2026-10-12: **unit 109/109**, **e2e 10/10**, lint/typecheck/build
clean. (E2E requires network access to the free Open-Meteo endpoints.)
