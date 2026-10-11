'use client';

/**
 * Settings context: loads user settings from IndexedDB, exposes updates.
 * Theme is mirrored to localStorage synchronously (sf:theme) so the
 * pre-paint script can apply it without waiting on IndexedDB.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { UserSettings } from '@/lib/models/types';
import { DEFAULT_SETTINGS } from '@/lib/models/types';
import { getSettings, saveSettings } from '@/lib/persistence/repositories';

interface SettingsContextValue {
  settings: UserSettings;
  ready: boolean;
  /** Persists before resolving; returns the new settings. */
  update: (patch: Partial<UserSettings>) => Promise<UserSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  // Mirror for async updates: `update` must persist the LATEST value,
  // including rapid successive patches, without stale closures.
  const settingsRef = useRef<UserSettings>(DEFAULT_SETTINGS);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        mirrorTheme(s.theme);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow system scheme changes when theme is 'system'.
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.classList.toggle('dark', mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  /**
   * Patch the settings and PERSIST before resolving. Callers that navigate
   * (e.g. the language onboarding) must `await update(...)` so the new page
   * reads the persisted value instead of the defaults.
   */
  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    if (patch.theme != null) mirrorTheme(patch.theme);
    try {
      await saveSettings(next);
    } catch {
      /* storage unavailable: state stays in memory for this session */
    }
    return next;
  }, []);

  const value = useMemo(
    () => ({ settings, ready, update }),
    [settings, ready, update]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function mirrorTheme(theme: UserSettings['theme']): void {
  try {
    localStorage.setItem('sf:theme', theme);
  } catch {
    /* storage unavailable — theme just won't pre-paint */
  }
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else if (theme === 'light') root.classList.remove('dark');
  else root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
