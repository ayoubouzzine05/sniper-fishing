# Contributing to Sniper Fishing

Thanks for your interest in making fishing forecasts more honest and more
useful. This document describes the workflow and the invariants that keep the
project trustworthy.

## Ground rules (non-negotiable)

These come from the project's core principles. PRs that break them will not
be merged:

1. **Never fabricate data.** No invented forecast values, no fake alerts, no
   "hotspots". Missing or stale data must be shown as missing — and the score
   must be penalized, not assumed.
2. **Safety is never overridden by score.** The safety assessment and the
   suitability score are independent; a high score can never hide a Dangerous
   safety status.
3. **No catch guarantees, no "scientifically validated" claims.** The score is
   a documented heuristic and must keep saying so in every locale.
4. **Safety-warning urgency must not weaken in any language.** Machine
   translations must be reviewed by a speaker before merging.
5. **Guest mode stays account-free and local.** No network call may be
   required for core functionality; the service-role key must never reach the
   browser.
6. **Original identity only.** No copied branding, code or UI from other
   products (e.g. Windy).

## Development setup

```bash
git clone <repo-url> && cd sniper-fishing
npm install
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck + unit tests
npm run test:e2e     # Playwright e2e (starts a prod build on :3111)
```

Node ≥ 18.17 (developed on Node 20). No API keys needed.

## How to submit a change

1. Fork and branch from `main` (`fix/…`, `feat/…`, `docs/…`).
2. Make the change; keep TypeScript strict-clean (`npm run typecheck`).
3. **Tests:**
   - Scoring/safety behavior → add or extend `tests/unit/` (Vitest).
   - User-visible flows → extend `tests/e2e/` (Playwright) and the shared
     helpers; selectors must be role/name based, not class based.
   - New user-facing strings → add them to **all four** message files
     (`messages/en.json` is canonical; `fr`, `ar`, `ary` must follow, with
     native-review for `ar`/`ary`). i18n completeness is covered by unit
     tests.
4. Run `npm run check` and `npm run test:e2e` locally before opening a PR.
5. Open the PR using the template; describe **what changed, why, and which
   tests prove it**.

## Code style

- Strict TypeScript; no unexplained `any`, no `@ts-ignore` without a comment
  explaining why.
- Small, focused modules. Provider adapters, scoring, safety, i18n and
  persistence each live in their own `lib/` folder — keep them that way.
- Every rendered data value carries its **source, units and timestamp**
  (see `ProviderFooter` for the pattern).
- Respect OSM attribution and the Open-Meteo license/attribution in any new
  provider work.

## Review criteria

- Correctness proven by executed tests (paste real output; never claim a pass
  that wasn't run).
- No regression of the ground rules above.
- RTL correctness for any layout change (ar/ary are RTL).
- Performance: no new client-side chatty endpoints; provider calls are
  cached with TTL + stale-while-error as in `lib/providers/http.ts`.

## Questions

Open a discussion/issue before large refactors. Be kind — see
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
