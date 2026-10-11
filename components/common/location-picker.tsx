'use client';

/**
 * Location picker: name search (Open-Meteo geocoding) + map point picking +
 * manual coordinates. Shared by dashboard, planner, logbook, settings.
 */
import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ForecastLocation } from '@/lib/models/types';
import { searchPlaces, type GeocodeResult } from '@/lib/providers/open-meteo/geocoding';
import MarineMap, { usePointPicker } from '@/components/map/marine-map';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { IconSearch, IconX } from '@/components/layout/icons';

const GEO_LANG: Record<string, string> = { ary: 'fr', ar: 'ar', fr: 'fr', en: 'en' };

export default function LocationPicker({
  value,
  onChange,
  compact = false
}: {
  value: ForecastLocation | null;
  onChange: (loc: ForecastLocation) => void;
  compact?: boolean;
}) {
  const t = useTranslations('map');
  const tSpots = useTranslations('spots');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const { point, picking, pick } = usePointPicker(GEO_LANG[locale] ?? 'en');

  const runSearch = useCallback(async () => {
    setSearching(true);
    const res = await searchPlaces(query, GEO_LANG[locale] ?? 'en');
    setResults(res);
    setSearching(false);
  }, [query, locale]);

  function choose(g: GeocodeResult) {
    onChange({
      id: `geo_${g.id}`,
      name: [g.name, g.admin1, g.country].filter(Boolean).join(', '),
      latitude: g.latitude,
      longitude: g.longitude,
      country: g.country,
      admin1: g.admin1,
      timezone: g.timezone
    });
    setResults([]);
    setQuery('');
  }

  function choosePoint() {
    if (!point) return;
    onChange({
      id: `pt_${point.latitude.toFixed(5)}_${point.longitude.toFixed(5)}`,
      name: point.label,
      latitude: point.latitude,
      longitude: point.longitude
    });
    setShowMap(false);
  }

  function chooseManual() {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordsError(tSpots('coordsError'));
      return;
    }
    setCoordsError(null);
    onChange({
      id: `man_${lat.toFixed(5)}_${lon.toFixed(5)}`,
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      latitude: lat,
      longitude: lon
    });
  }

  return (
    <div className="space-y-3">
      {/* search */}
      <div>
        <label className="label-base">{t('searchPlaceholder')}</label>
        <div className="relative">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder={t('searchPlaceholder')}
            className="pe-9"
          />
          <button
            onClick={runSearch}
            aria-label={t('searchPlaceholder')}
            className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800"
          >
            <IconSearch className="h-4 w-4" />
          </button>
        </div>
        {searching ? <p className="mt-1 text-xs text-navy-400">…</p> : null}
        {results.length > 0 ? (
          <ul className="mt-1 divide-y divide-navy-100 overflow-hidden rounded-lg border border-navy-200 dark:divide-navy-800 dark:border-navy-700">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => choose(r)}
                  className="flex w-full items-center justify-between gap-2 bg-white px-3 py-2 text-start text-sm hover:bg-ocean-50 dark:bg-navy-900 dark:hover:bg-navy-800"
                >
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-xs text-navy-400">{r.admin1 ?? r.country ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.length >= 2 ? (
          <p className="mt-1 text-xs text-navy-400">{t('noResults')}</p>
        ) : null}
      </div>

      {/* current selection */}
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-ocean-300 bg-ocean-50/60 px-3 py-2 text-sm dark:border-ocean-800 dark:bg-ocean-900/20">
          <span className="truncate font-semibold">{value.name}</span>
          <span className="ltr shrink-0 text-xs text-navy-500">
            {value.latitude.toFixed(3)}, {value.longitude.toFixed(3)}
          </span>
          <button
            onClick={() => onChange({ ...value, name: value.name })}
            aria-label="clear"
            className="ms-auto rounded p-1 text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* map picker */}
      {showMap ? (
        <div className="space-y-2">
          <MarineMap
            selected={point ? { id: 'p', name: point.label, latitude: point.latitude, longitude: point.longitude } : value}
            spots={[]}
            center={point ? [point.latitude, point.longitude] : value ? [value.latitude, value.longitude] : [31.8, -7.1]}
            height="h-64"
            onPick={(lat, lon) => void pick(lat, lon)}
          />
          <p className="text-xs text-navy-500">{t('clickHint')}</p>
          {point ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{point.label}</span>
              <Button onClick={choosePoint} disabled={picking} className="ms-auto">
                {t('useHere')}
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" onClick={() => setShowMap(false)}>
            {t('close')}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowMap(true)}>
          {t('pickOnMap')}
        </Button>
      )}

      {/* manual coordinates */}
      {!compact ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lat')}>
            <TextInput
              inputMode="decimal"
              dir="ltr"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="35.7595"
            />
          </Field>
          <Field label={t('lon')}>
            <TextInput
              inputMode="decimal"
              dir="ltr"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              placeholder="-5.8340"
            />
          </Field>
        </div>
      ) : null}
      {coordsError ? (
        <p className="text-xs font-semibold text-red-600" role="alert">{coordsError}</p>
      ) : null}
      {!compact ? (
        <Button variant="secondary" onClick={chooseManual}>
          {t('useHere')}
        </Button>
      ) : null}
    </div>
  );
}
