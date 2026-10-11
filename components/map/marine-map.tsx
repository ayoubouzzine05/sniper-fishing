'use client';

/**
 * Interactive marine map — SSR-safe wrapper.
 *
 * The Leaflet canvas lives in `marine-map-canvas.tsx` and is loaded with
 * `next/dynamic(..., { ssr: false })`: Leaflet's module scope references
 * `window`, so it must never be evaluated on the server. SSR renders the
 * frame + legend; the map itself mounts on the client.
 *
 * Tiles: OpenStreetMap (ODbL) — attribution required and shown both in
 * Leaflet's attribution control (canvas) and in the static legend below.
 */
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ForecastLocation, Spot } from '@/lib/models/types';
import { reverseGeocode } from '@/lib/providers/open-meteo/reverse';

const MarineMapCanvas = dynamic(() => import('./marine-map-canvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-navy-100 dark:bg-navy-900" aria-hidden />
});

export interface MapSelection {
  latitude: number;
  longitude: number;
  label: string;
}

export default function MarineMap({
  selected,
  spots,
  center,
  height = 'h-[420px]',
  onPick,
  onMarkerClick
}: {
  selected: ForecastLocation | null;
  spots: Spot[];
  center: [number, number];
  height?: string;
  onPick?: (lat: number, lon: number) => void;
  onMarkerClick?: (spot: Spot) => void;
}) {
  const t = useTranslations('map');

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-navy-200 dark:border-navy-800 ${height}`}
      role="application"
      aria-label={t('title')}
    >
      <MarineMapCanvas
        selected={selected}
        spots={spots}
        center={center}
        onPick={onPick}
        onMarkerClick={onMarkerClick}
      />
      <div className="pointer-events-none absolute bottom-2 start-2 z-[500] max-w-[240px] rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] leading-snug text-navy-600 shadow dark:bg-navy-900/90 dark:text-navy-300">
        <div className="font-bold">{t('legend')}</div>
        <div>◉ {t('legendSelected')}</div>
        <div>◉ {t('legendSpot')}</div>
        <div className="text-amber-600 dark:text-amber-400">◉ {t('legendFavorite')}</div>
        <div className="mt-0.5 text-navy-400">{t('tilesAttrib')}</div>
      </div>
    </div>
  );
}

/**
 * Hook: track the picked point and lazily reverse-geocode it into a label.
 * Falls back to "lat, lon" — never invents a place name.
 */
export function usePointPicker(lang: string) {
  const [point, setPoint] = useState<MapSelection | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = useMemo(
    () =>
      async (lat: number, lon: number) => {
        setPicking(true);
        const rev = await reverseGeocode(lat, lon, lang);
        const label = rev
          ? [rev.name, rev.admin1, rev.country].filter(Boolean).join(', ')
          : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        setPoint({ latitude: lat, longitude: lon, label });
        setPicking(false);
      },
    [lang]
  );

  return { point, picking, pick, clearPoint: () => setPoint(null) };
}
