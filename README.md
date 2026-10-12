# Sniper Fishing

> **Read the Sea. Find Your Moment.**

An open-source, privacy-first **fishing forecast web app** built for shore
anglers — with **Moroccan anglers first** (surfcasting, shore spinning, harbor,
rock, float, kayak and boat fishing on the Atlantic and Mediterranean coasts).

Sniper Fishing reads real marine and weather data, turns it into a **transparent
0–100 suitability score per fishing method** plus an independent **safety
assessment**, and gives you a marine map, a 24-hour forecast strip, a trip
planner, a personal catch logbook and private fishing spots — all in your
language: **Moroccan Darija (default), Modern Standard Arabic, French and
English**, with full RTL support.

---

## What it does

- **Marine dashboard** — current conditions (wind, gusts, wave, swell, SST,
  ocean current, sea level, rain, visibility, pressure, cloud, humidity,
  weather, sunrise/sunset/daylight), a **Next 24 hours** hourly strip, a 48h
  wind + wave chart, and a **Fishing suitability** score with a per-factor
  explanation and the best estimated windows.
- **Transparent scoring** — every factor (wind, gusts, wave, swell, rain,
  visibility, daylight, sea temperature, tide) contributes a human-readable
  reason. Missing or stale data **penalizes** the score; it is never assumed.
  Data completeness is reported separately from the score.
- **Safety assessment** — an independent Favorable / Caution / Unfavorable /
  Dangerous / Insufficient-data status with clear do-not-go messaging. Safety
  **can never be overridden** by a high score, and the app is explicit that it
  is not a navigation or emergency system.
- **Marine map** (Leaflet + OpenStreetMap) — geocode search, tap-to-pick a
  point, saved spots, wind/wave direction indicators and a live forecast panel.
- **Fishing forecast page** — pick method, region preset, date and session
  window; get the hourly score chart, per-factor breakdown, best windows,
  missing-data disclosure and provider attribution.
- **Trip planner** — generate a localized, printable/exportable report for a
  planned session (hour-by-hour conditions, averages, warnings, data gaps).
- **Fishing spots** — full CRUD, manual coordinates or map pick, types,
  methods, target species, photos (≤ 500 KB each, stored on device), access
  notes, favorites and **private notes** that are never shown in the list.
  Export/import JSON + CSV.
- **Catch logbook** — sessions with catches (species, weight, length, optional
  photo ≤ 500 KB), session photos, bait/lure, equipment, an auto-captured
  conditions snapshot,
  zero-catch support, and **personal-only analytics** (sessions/month, by
  species, catch rate, by method/location, bait performance, "conditions when
  you caught fish") with a clear correlation-≠-causation disclaimer.
- **Settings** — language (4 locales), theme (light/dark/system), wind/distance/
  temperature units, default method and location, full **data export/import**
  and local delete, plus an **optional** Supabase account for cloud sync.

### Data providers
- **Open-Meteo Marine API** (waves, swell, SST, ocean current, sea level) and
  **Open-Meteo Forecast API** (wind, gusts, weather, precipitation, pressure,
  visibility, sunrise/sunset). Both are **free and key-less**; the app states
  the license, attribution and "data as of" age for every displayed dataset.
- **Open-Meteo geocoding** + **BigDataCloud** free client-side reverse
  geocoding for the map.
- **Tides:** there is intentionally **no authoritative local tide table**.
  Open-Meteo's sea-level values are shown as *model estimates* and the app says
  so — it never presents them as a nautical almanac.

### Honesty & safety guarantees
- **No fabricated data, ever.** If a provider fails or a value is missing, the
  UI says so ("Not available", "Some data are missing… the score is penalized,
  not assumed") and offers a retry. There are no invented "hotspots" or catch
  predictions.
- The suitability score is a **configurable heuristic, not a scientifically
  validated model**, and it **never guarantees a catch** — this is stated in
  Settings → About and in the app itself.
- **Guest mode is fully functional** without any account. Everything is stored
  in your browser (IndexedDB + a small localStorage mirror). Nothing is sent to
  a server unless you opt into an account.

---

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Framework | **Next.js 14 (App Router)** + **TypeScript (strict)** |
| Styling   | **Tailwind CSS** |
| i18n      | **next-intl** — 4 complete locales, RTL, locale-aware units/dates |
| Map       | **Leaflet** + **react-leaflet** (OpenStreetMap tiles) |
| Charts    | **Recharts** |
| Validation| **Zod** (all provider responses + stored data) |
| Scoring   | A separate, deterministic, unit-tested **TypeScript module** (`lib/scoring`) |
| Persistence | **IndexedDB** (guest) + optional **Supabase** (Postgres, RLS) |
| PWA       | Manifest, icons, service worker, offline shell, cached-forecast age labels |
| Tests     | **Vitest** (unit) + **Playwright** (e2e) |

---

## Getting started

### Requirements
- **Node.js ≥ 18.17** (developed on Node 20).
- No API keys are required. The only optional variables enable cloud sync.

### Install & run
```bash
git clone <your-fork-or-the-repo-url> sniper-fishing
cd sniper-fishing
npm install

# Development (http://localhost:3000)
npm run dev

# Production build + start
npm run build
npm start            # serves on http://localhost:3000
```

On first launch you'll see the language onboarding screen in the default
locale (Moroccan Darija). Pick your language — the choice is saved on the
device and can be changed anytime in Settings.

### Environment variables (all optional)
Copy `.env.example` to `.env.local` and fill in only what you need:
```bash
# Optional cloud sync — leave unset for fully-local guest mode.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
> Only the **public anon key** belongs in `NEXT_PUBLIC_*` env vars. The
> service-role key must **never** be shipped to the browser; row level
> security is what makes anon-key access safe. See [SECURITY.md](SECURITY.md).

### Run the tests
```bash
# Unit tests (scoring, safety, providers, units, wind, i18n, storage, …)
npm test

# E2E (needs a production build served on port 3111; Playwright starts it)
npm run test:e2e

# Lint + typecheck + unit in one go
npm run check
```

> The e2e suite uses the **real** Open-Meteo APIs (no keys, non-commercial).
> It verifies live data rendering and also simulates a total provider failure
> to confirm graceful degradation.

### PWA / offline
In a production build the app registers a service worker, provides a web
manifest and app icons, and works as an installable offline shell. Cached
forecasts are labelled with their age — the app never implies offline data is
live.

### Android app (Capacitor)
The same web build is wrapped into a native Android app with Capacitor
(`android/`, `capacitor.config.ts`). No Play Store required — install the
debug APK directly on any phone (Android 6.0+).

```bash
# 1. Build the static web bundle (out/) — see script for details
node scripts/build-web-for-android.mjs
# 2. Bundle it into the Android project
npx cap sync android
# 3. Build the debug APK (needs JDK 17+ and the Android SDK, API 35)
cd android && ./gradlew assembleDebug
#    → android/app/build/outputs/apk/debug/app-debug.apk
```

Every push to `main` also rebuilds the APK on GitHub Actions (workflow:
`.github/workflows/android-apk.yml`) — download it from the run's **Artifacts**.
The debug APK is signed with the Android debug keystore (local use only).

---

## Project structure
```
app/            # Next.js App Router: [locale] pages, layout, welcome, settings
components/     # UI: layout, forecast, map, charts, logbook, ui primitives
lib/
  providers/    # Modular API adapters (Open-Meteo marine/forecast/geocode, tides, warnings)
  scoring/      # Deterministic 0-100 scoring engine + method profiles + windows
  safety/       # Independent safety assessment (never overridden by score)
  i18n/         # next-intl routing, locale-aware number/date/unit formatting
  persistence/  # IndexedDB repositories, export/import (JSON/CSV)
  supabase/     # Optional cloud-sync client (off unless configured)
  hooks/        # useSettings, useForecast
messages/       # en, fr, ar, ary — complete, hand-reviewed translations
i18n/           # Routing + RTL config
public/         # PWA manifest, icons, logo, service worker
tests/          # unit/ (Vitest) and e2e/ (Playwright)
supabase/       # migrations (Postgres schema + RLS)
docs/           # ARCHITECTURE, SETUP, IMPLEMENTATION_STATUS
```
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module contracts and
[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for what is
done, what is limited, and what is next.

---

## Configuration (scoring & safety)

Method profiles and safety thresholds live in `lib/scoring` and `lib/safety`
as **documented, configurable presets**. The Moroccan Atlantic/Mediterranean
presets are labelled in-app as **initial heuristics**, not validated science.
Changing a threshold or weight is a code change reviewed like any other —
every change is covered by unit tests.

---

## Privacy
- Guest mode stores **only** your data, **only** on your device (IndexedDB).
- Spots are **never published** and **never shared** by default.
- Logbook analytics use **your own records only** and warn that small samples
  do not prove causation.
- You can **export all your data** (JSON) or **delete it** at any time from
  Settings → Data & privacy.

---

## License
Released under the **MIT License** — see [LICENSE](LICENSE). In short: use it,
modify it, and ship it, with attribution and the standard no-warranty clause.
(Why MIT over AGPL-3.0? MIT maximizes adoption for a free-data, open tool and
imposes no copyleft on integrators; see the note in
[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).)

Respect the data licenses you're using: Open-Meteo (CC BY 4.0, non-commercial,
<10k calls/day) and OpenStreetMap (ODbL) — both are credited in-app.

---

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md). We ask that you:
- Keep the "never fabricate data" and "safety is never overridden" invariants.
- Add/adjust unit tests for any scoring or safety change.
- Keep all four locales in sync when you touch a user-facing string.

## Security
See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

---

*Built for the patience of the shore. Tides are estimates, fish are
unpredictable — go out safe.* 🎣
