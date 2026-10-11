/**
 * Minimal Promise-based IndexedDB wrapper.
 *
 * - DB: "sniper-fishing", object stores: spots, sessions, settings, plans.
 * - If IndexedDB is unavailable (private browsing, SSR), transparently falls
 *   back to an in-memory store for the page session (data will NOT persist
 *   across reloads in that mode — the UI is told via `backend`).
 * - No external dependency; ~100 lines, fully tested with fake-indexeddb.
 */

export type StoreName = 'spots' | 'sessions' | 'settings' | 'plans';

const STORES: StoreName[] = ['spots', 'sessions', 'settings', 'plans'];
const DB_NAME = 'sniper-fishing';
const DB_VERSION = 1;

export type BackendKind = 'indexeddb' | 'memory';

interface MemoryStore {
  [k: string]: unknown;
}

let memory: Map<StoreName, MemoryStore> | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;
let currentBackend: BackendKind = 'memory';

function memoryStores(): Map<StoreName, MemoryStore> {
  if (!memory) {
    memory = new Map(STORES.map((s) => [s, {}] as const));
  }
  return memory;
}

export function currentBackendKind(): BackendKind {
  return currentBackend;
}

/** Test hook: force the in-memory backend (also used when IDB is absent). */
export function forceMemoryBackend(): void {
  currentBackend = 'memory';
  memory = null;
  dbPromise = null;
}

function openIdb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => {
      currentBackend = 'indexeddb';
      resolve(req.result);
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  return dbPromise;
}

function tx<T>(
  db: IDBDatabase,
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (os: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await openIdb();
    return await fn(db);
  } catch {
    currentBackend = 'memory';
    throw new Error('IndexedDB unavailable');
  }
}

/* ------------------------------ Public API ----------------------------- */

export async function getAll<T>(store: StoreName): Promise<T[]> {
  try {
    const items = await withDb((db) =>
      tx<unknown[]>(db, store, 'readonly', (os) => os.getAll())
    );
    return items as T[];
  } catch {
    const s = memoryStores().get(store);
    return s ? (Object.values(s) as T[]) : [];
  }
}

export async function get<T>(store: StoreName, id: string): Promise<T | null> {
  try {
    const item = await withDb((db) =>
      tx<unknown>(db, store, 'readonly', (os) => os.get(id))
    );
    return (item as T) ?? null;
  } catch {
    const s = memoryStores().get(store);
    return (s?.[id] as T) ?? null;
  }
}

export async function put<T extends { id: string }>(store: StoreName, item: T): Promise<void> {
  try {
    await withDb((db) => tx(db, store, 'readwrite', (os) => os.put(item)));
  } catch {
    const s = memoryStores().get(store) ?? {};
    s[item.id] = item;
    memoryStores().set(store, s);
  }
}

export async function del(store: StoreName, id: string): Promise<void> {
  try {
    await withDb((db) => tx(db, store, 'readwrite', (os) => os.delete(id)));
  } catch {
    const s = memoryStores().get(store);
    if (s) delete s[id];
  }
}

export async function clear(store: StoreName): Promise<void> {
  try {
    await withDb((db) => tx(db, store, 'readwrite', (os) => os.clear()));
  } catch {
    memoryStores().set(store, {});
  }
}

export async function clearAll(): Promise<void> {
  for (const s of STORES) await clear(s);
}

/** Generate a short unique id without external deps. */
export function newId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}
