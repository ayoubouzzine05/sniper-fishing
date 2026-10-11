/**
 * Repository layer over the persistence wrapper: spots, sessions, settings,
 * plans. All async, all validated (zod) at the boundaries.
 */
import { getAll, get, put, del, clear } from './db';
import type {
  FishingSession,
  Spot,
  TripPlan,
  UserSettings
} from '@/lib/models/types';
import { DEFAULT_SETTINGS } from '@/lib/models/types';
import {
  SessionSchema,
  SettingsSchema,
  SpotSchema,
  TripPlanSchema
} from '@/lib/validation/schemas';

export async function listSpots(): Promise<Spot[]> {
  const rows = await getAll<unknown>('spots');
  return rows
    .map((r) => {
      const p = SpotSchema.safeParse(r);
      return p.success ? p.data : null;
    })
    .filter((s): s is Spot => s != null)
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

export async function saveSpot(spot: Spot): Promise<Spot> {
  const parsed = SpotSchema.parse(spot);
  await put('spots', parsed);
  return parsed;
}

export async function deleteSpot(id: string): Promise<void> {
  await del('spots', id);
}

export async function listSessions(): Promise<FishingSession[]> {
  const rows = await getAll<unknown>('sessions');
  return rows
    .map((r) => {
      const p = SessionSchema.safeParse(r);
      return p.success ? p.data : null;
    })
    .filter((s): s is FishingSession => s != null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.startTime.localeCompare(b.startTime)));
}

export async function saveSession(session: FishingSession): Promise<FishingSession> {
  const parsed = SessionSchema.parse(session);
  await put('sessions', parsed);
  return parsed;
}

export async function deleteSession(id: string): Promise<void> {
  await del('sessions', id);
}

const SETTINGS_LS_KEY = 'sf:settings';

/**
 * Synchronous mirror of settings in localStorage.
 *
 * WHY: an IndexedDB write commits in a later task. A page that navigates
 * immediately after `saveSettings()` (e.g. the language onboarding switching
 * locale, which remounts the whole [locale] tree) could otherwise read a
 * pre-commit snapshot, see the defaults, and bounce the user back to the
 * onboarding screen. The localStorage copy is written synchronously and
 * read first — the race cannot happen.
 */
function readSettingsFromLocalStorage(): UserSettings | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (raw == null) return null;
    const p = SettingsSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null; // corrupted cache — fall back to IndexedDB
  }
}

function writeSettingsToLocalStorage(s: UserSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(s));
    }
  } catch {
    /* storage unavailable — IndexedDB remains authoritative */
  }
}

export async function getSettings(): Promise<UserSettings> {
  const fast = readSettingsFromLocalStorage();
  if (fast != null) {
    // Keep IndexedDB in sync with the fresh mirror (fire and forget).
    void put('settings', { id: 'user', ...fast }).catch(() => undefined);
    return fast;
  }
  const row = await get<unknown>('settings', 'user');
  if (row == null) return { ...DEFAULT_SETTINGS };
  const p = SettingsSchema.safeParse(row);
  return p.success ? p.data : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  const parsed = SettingsSchema.parse(settings);
  // Synchronous mirror FIRST: any page that loads in the meantime (a locale
  // switch does a full document swap) must never see pre-write state.
  writeSettingsToLocalStorage(parsed);
  await put('settings', { id: 'user', ...parsed });
  return parsed;
}

export async function listPlans(): Promise<TripPlan[]> {
  const rows = await getAll<unknown>('plans');
  return rows
    .map((r) => {
      const p = TripPlanSchema.safeParse(r);
      return p.success ? p.data : null;
    })
    .filter((p): p is TripPlan => p != null);
}

export async function savePlan(plan: TripPlan): Promise<TripPlan> {
  const parsed = TripPlanSchema.parse(plan);
  await put('plans', parsed);
  return parsed;
}

export async function deletePlan(id: string): Promise<void> {
  await del('plans', id);
}

/** Wipe everything (used by "Delete all my data" after explicit confirm). */
export async function wipeAllData(): Promise<void> {
  await clear('spots');
  await clear('sessions');
  await clear('plans');
  await put('settings', { id: 'user', ...DEFAULT_SETTINGS });
  writeSettingsToLocalStorage({ ...DEFAULT_SETTINGS });
}
