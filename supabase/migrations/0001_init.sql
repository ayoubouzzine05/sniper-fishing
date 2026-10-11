-- ===========================================================================
-- Sniper Fishing — 0001_init.sql
-- Optional cloud-sync schema (Supabase Postgres).
--
-- The app is fully functional WITHOUT this schema (guest mode, IndexedDB).
-- These tables are only used when the user signs in with an account
-- (Settings → Account) and clicks "Sync now" — they hold a per-user copy of
-- the user's own spots and logbook sessions.
--
-- Identity model:
--   user_id is the signed-in user's email (auth.email()). Keeping it as
--   plain text avoids a join to auth.users and works with the anon key +
--   RLS below.
--
-- Privacy:
--   * Row Level Security is ENABLED on every table.
--   * A user can only ever see/modify rows where user_id = auth.email().
--   * Spots are NEVER published: there is no public/anon read policy, and
--     the app never broadcasts spots to other clients.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- spots
-- ---------------------------------------------------------------------------
create table if not exists public.spots (
  id            text        not null,
  user_id       text        not null,
  name          text        not null,
  description   text        not null default '',
  latitude      double precision not null,
  longitude     double precision not null,
  location_type text        not null,
  methods       text[]      not null default '{}',
  target_species text[]     not null default '{}',
  access_notes  text        not null default '',
  private_notes text        not null default '',
  is_favorite   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One row per (user, spot id): the same generated id under two different
  -- users is a different row.
  primary key (user_id, id)
);

create index if not exists spots_lat_lon_idx
  on public.spots (latitude, longitude);

-- ---------------------------------------------------------------------------
-- sessions (catch logbook)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id               text        not null,
  user_id          text        not null,
  date             date        not null,
  start_time       text        not null,
  end_time         text        not null,
  location         jsonb       not null,   -- ForecastLocation
  spot_id          text        null,
  method           text        not null,
  target_species   text[]      not null default '{}',
  bait_or_lure     text        not null default '',
  equipment_notes  text        not null default '',
  notes            text        not null default '',
  conditions       jsonb       null,       -- SessionConditions snapshot (or null)
  catches          jsonb       not null default '[]'::jsonb, -- CatchEntry[]
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists sessions_date_idx
  on public.sessions (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.spots    enable row level security;
alter table public.sessions enable row level security;

-- Own rows only: select
create policy "spots_select_own"    on public.spots
  for select using (user_id = auth.email());
create policy "sessions_select_own" on public.sessions
  for select using (user_id = auth.email());

-- Own rows only: insert
create policy "spots_insert_own"    on public.spots
  for insert with check (user_id = auth.email());
create policy "sessions_insert_own" on public.sessions
  for insert with check (user_id = auth.email());

-- Own rows only: update
create policy "spots_update_own"    on public.spots
  for update using (user_id = auth.email())
            with check (user_id = auth.email());
create policy "sessions_update_own" on public.sessions
  for update using (user_id = auth.email())
            with check (user_id = auth.email());

-- Own rows only: delete
create policy "spots_delete_own"    on public.spots
  for delete using (user_id = auth.email());
create policy "sessions_delete_own" on public.sessions
  for delete using (user_id = auth.email());

-- No "anon" (signed-out) policies exist on purpose: a signed-out client with
-- the anon key cannot read, write or enumerate anything in these tables.
