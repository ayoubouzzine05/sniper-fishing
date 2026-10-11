# Security Policy

## Scope

Sniper Fishing handles:

- **Personal, device-local data** (fishing spots, catch logbook, preferences)
  stored in the browser's IndexedDB/localStorage.
- An **optional Supabase account** (email/password auth + per-user rows) for
  cloud sync.
- **No payment data, no tracking, no analytics cookies.**

A vulnerability in this project could expose a user's private spots/logbook,
allow cross-user data access in the optional cloud sync, or serve false
"safety-critical" information (which is a safety issue in itself).

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | Yes |
| Anything older than the latest release | No — please upgrade |

## How to report a vulnerability

**Do not open a public issue for security problems.**

1. Email the maintainers using the contact in the repository's
   *About* / *Insights* section, or file a private report via GitHub's
   **Security → Advisories → New draft advisory** if the repo has that
   enabled.
2. Include: a description of the issue, the affected component, and a
   minimal reproduction (steps or a snippet). Do not include real user data.
3. We aim to acknowledge within **7 days** and provide a remediation plan
   within **30 days**, with a patch or a public advisory when the fix lands.

## What NOT to do

- Do not publish PoCs that exfiltrate other users' data.
- Do not test against other users' Supabase accounts.
- Do not hammer the free Open-Meteo endpoints (non-commercial,
  <10k calls/day) beyond normal development use.

## Threat model & mitigations already in place

- **No secrets in the client bundle.** Only the Supabase *anon* key may live
  in `NEXT_PUBLIC_*` env vars. The service-role key is server-side only and is
  not used by this client app at all.
- **Row Level Security** on all Supabase tables
  (`supabase/migrations/0001_init.sql`): a user can only read/write/delete
  rows where `user_id = auth.email()`; there are no anon read policies.
- **Zod validation** of every provider response and of every imported data
  file — untrusted input (APIs, import files) never reaches storage raw.
- **CORS-friendly, key-less public APIs** (Open-Meteo, BigDataCloud
  geocoding) — no credential material flows through the browser for them.
- **No `eval`, no inline scripts in user data**, photos are size-capped
  (≤500 KB) and stored as data URLs only in the user's own database.

## Past incidents

None reported as of 2026-10-11.
