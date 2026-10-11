/**
 * Tiny in-memory pub/sub for the "active location" so the map, dashboard,
 * forecast and planner stay in sync during a page session.
 *
 * The persistent copy lives in settings (defaultLocation) in IndexedDB;
 * this store is only the reactive overlay for the current tab.
 */
import type { ForecastLocation } from '@/lib/models/types';

type Listener = (loc: ForecastLocation | null) => void;

let current: ForecastLocation | null = null;
const listeners = new Set<Listener>();

export function setActiveLocation(loc: ForecastLocation | null): void {
  current = loc;
  for (const l of listeners) l(loc);
}

export function getActiveLocation(): ForecastLocation | null {
  return current;
}

export function onActiveLocation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
