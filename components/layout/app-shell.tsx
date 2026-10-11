'use client';

/**
 * App shell: header (logo, location, theme + language), main navigation
 * (desktop sidebar / mobile bottom bar), offline banner, PWA registration.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Logo from './logo';
import LanguageSwitcher from './language-switcher';
import ThemeToggle from './theme-toggle';
import {
  IconDashboard,
  IconMap,
  IconFish,
  IconPin,
  IconCalendar,
  IconBook,
  IconGear
} from './icons';
import { useSettings } from '@/lib/hooks/use-settings';
import { getActiveLocation, onActiveLocation, setActiveLocation } from '@/lib/state/location-store';

const NAV_ITEMS = [
  { key: 'nav.dashboard', href: '/', icon: IconDashboard },
  { key: 'nav.map', href: '/map', icon: IconMap },
  { key: 'nav.forecast', href: '/forecast', icon: IconFish },
  { key: 'nav.spots', href: '/spots', icon: IconPin },
  { key: 'nav.planner', href: '/planner', icon: IconCalendar },
  { key: 'nav.logbook', href: '/logbook', icon: IconBook },
  { key: 'nav.settings', href: '/settings', icon: IconGear }
] as const;

export default function AppShell({
  children,
  appName,
  tagline
}: {
  children: ReactNode;
  appName: string;
  tagline: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { settings, ready, update } = useSettings();
  const [activeLoc, setActiveLoc] = useState<{ name: string } | null>(getActiveLocation());
  const [online, setOnline] = useState(true);

  // Sync active location across pages (in-memory store + settings).
  useEffect(() => {
    const loc = getActiveLocation() ?? settings.defaultLocation;
    if (loc) setActiveLoc({ name: loc.name });
    const off = onActiveLocation((l) => setActiveLoc(l ? { name: l.name } : null));
    return off;
  }, [settings.defaultLocation]);

  // First launch → onboarding (language welcome screen).
  useEffect(() => {
    if (ready && !settings.onboardingDone && pathname !== '/welcome') {
      router.replace('/welcome', { locale: settings.language });
    }
  }, [ready, settings.onboardingDone, pathname, router, settings.language]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    // PWA: register the service worker in production builds only.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  function handleUseLocation() {
    const loc = getActiveLocation();
    if (loc) {
      void update({ defaultLocation: loc });
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ocean-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Sniper
      </a>

      {!online ? (
        <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-navy-950" role="status">
          {t('common.offline')}
        </div>
      ) : null}

      {/* Header */}
      <header className="no-print sticky top-0 z-40 border-b border-navy-200/70 bg-white/85 backdrop-blur dark:border-navy-800 dark:bg-navy-950/85">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5" aria-label={appName}>
            <Logo size={34} />
            <span className="hidden flex-col sm:flex">
              <span className="text-sm font-extrabold leading-tight tracking-tight">{appName}</span>
              <span className="text-[10px] font-medium text-navy-500 dark:text-navy-400">{tagline}</span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-2 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 md:flex dark:border-navy-700 dark:bg-navy-900">
              <IconPin className="h-4 w-4 text-ocean-600 dark:text-ocean-400" />
              <span className="max-w-[180px] truncate text-xs font-semibold">
                {activeLoc ? activeLoc.name : settings.defaultLocation?.name ?? '—'}
              </span>
              {activeLoc && activeLoc.name !== (settings.defaultLocation?.name ?? '') ? (
                <button
                  onClick={handleUseLocation}
                  className="rounded bg-ocean-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-ocean-700"
                >
                  {t('common.save')}
                </button>
              ) : null}
            </div>
            <ThemeToggle />
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar */}
        <nav
          aria-label="Main"
          className="no-print hidden w-52 shrink-0 border-e border-navy-200/70 dark:border-navy-800 md:block"
        >
          <ul className="sticky top-16 space-y-0.5 p-3">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition
                      ${
                        active
                          ? 'bg-ocean-600 text-white shadow'
                          : 'text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800'
                      }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{t(item.key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1 px-4 py-5 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-navy-200 bg-white/95 backdrop-blur dark:border-navy-800 dark:bg-navy-950/95 md:hidden"
      >
        <ul className="flex overflow-x-auto px-1" role="list">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex-1 min-w-[64px]">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-semibold
                    ${active ? 'text-ocean-700 dark:text-ocean-300' : 'text-navy-500 dark:text-navy-400'}`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-ocean-600 dark:text-ocean-400' : ''}`} />
                  <span className="whitespace-nowrap">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export { setActiveLocation };
