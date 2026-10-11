/**
 * Locale-aware number/date/time formatting.
 *
 * Locale mapping:
 *  - 'ary' (Moroccan Darija, project-defined variant) → 'ar-MA-u-nu-latn'
 *    (Arabic script UI, Latin/Western digits — standard Moroccan practice).
 *  - 'ar' → 'ar-MA-u-nu-latn' (same digit convention for consistency).
 *  - 'fr' → 'fr-MA', 'en' → 'en-GB' (metric-first).
 *
 * IMPORTANT: forecast provider times arrive as LOCAL WALL TIME at the
 * location (no UTC offset). We therefore never run them through UTC-based
 * formatters. `formatWallTime` / `formatWallDate` parse the wall clock
 * string directly. For instant-based strings (fetchedAt etc.) we use
 * `formatInstant` with the user's browser timezone.
 */

export function intlLocale(locale: string): string {
  switch (locale) {
    case 'ary':
    case 'ar':
      return 'ar-MA-u-nu-latn';
    case 'fr':
      return 'fr-MA';
    case 'en':
    default:
      return 'en-GB';
  }
}

export function formatNumber(locale: string, value: number, maxFractionDigits = 1): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits: maxFractionDigits
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatPercent(locale: string, value: number): string {
  return formatNumber(locale, value, 0) + '%';
}

/** 'YYYY-MM-DDTHH:mm' (wall time) → 'HH:mm' */
export function formatWallTime(t: string | null | undefined): string {
  if (!t) return '—';
  const m = t.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return t;
  return `${m[2]}:${m[3]}`;
}

/** 'YYYY-MM-DDTHH:mm' (wall time) → localized date (e.g. "11 Oct 2026"). */
export function formatWallDate(
  locale: string,
  t: string | null | undefined,
  opts: { weekday?: boolean } = {}
): string {
  if (!t) return '—';
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return t;
  // Wall time → instant that formats back to the same wall clock (use UTC
  // purely as a container; display only).
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(opts.weekday ? { weekday: 'short' } : {})
    }).format(d);
  } catch {
    return t.slice(0, 10);
  }
}

/** Instant (ISO) → localized for the USER's browser timezone. */
export function formatInstant(locale: string, iso: string, withSeconds = false): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {}),
      timeZone: undefined
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDurationHours(locale: string, hours: number | null): string {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${formatNumber(locale, h, 0)}h ${formatNumber(locale, m, 0)}m`;
}

/** Human "age" for cached data, e.g. "12 min" / "3 h". */
export function formatAge(locale: string, minutes: number): string {
  if (minutes < 60) return `${formatNumber(locale, minutes, 0)} min`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${formatNumber(locale, h, 0)} h`;
  const d = Math.floor(h / 24);
  return `${formatNumber(locale, d, 0)} d`;
}
