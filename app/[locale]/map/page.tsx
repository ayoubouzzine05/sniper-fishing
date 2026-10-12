'use client';

/**
 * Marine Map: interactive Leaflet map with search, point picking, saved
 * spot markers, a forecast side-panel that updates with the selection, a
 * legend, and "save spot here".
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Field, TextInput, Select } from '@/components/ui/field';
import MarineMap from '@/components/map/marine-map';
import LocationPicker from '@/components/common/location-picker';
import ProviderFooter from '@/components/forecast/provider-footer';
import { useSettings } from '@/lib/hooks/use-settings';
import { useForecast } from '@/lib/hooks/use-forecast';
import { snapshotNearestNow, wallClockNowInTimezone } from '@/lib/providers/merge';
import { setActiveLocation } from '@/lib/state/location-store';
import { listSpots, saveSpot } from '@/lib/persistence/repositories';
import { newId } from '@/lib/persistence/db';
import { windDisplay, windUnitLabel, heightDisplay, heightUnitLabel } from '@/lib/units/conversion';
import { formatNumber, formatWallTime } from '@/lib/i18n/format';
import { compassFromDegrees } from '@/lib/geo/wind';
import type { LocationType, Spot } from '@/lib/models/types';
import { COASTAL_TOWNS } from '@/lib/locations/coastal-towns';

const TYPE_OPTIONS: LocationType[] = [
  'shore', 'harbor', 'port', 'beach', 'rock', 'jetty', 'estuary', 'open_water', 'other'
];

export default function MapPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, ready, update } = useSettings();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [spotName, setSpotName] = useState('');
  const [spotType, setSpotType] = useState<LocationType>('shore');
  const [spotSaved, setSpotSaved] = useState(false);
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());

  const location = settings.defaultLocation;
  const { data, loading, error, retry } = useForecast(location, 2);

  useEffect(() => {
    listSpots().then(setSpots).catch(() => setSpots([]));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowIso(new Date().toISOString()), 60_000);
    return () => clearInterval(id);
  }, []);

  const current = useMemo(() => {
    if (!data || !location) return null;
    const tz = data.weather?.timezone ?? data.marine?.timezone ?? location.timezone ?? 'Africa/Casablanca';
    return snapshotNearestNow(data.hours, wallClockNowInTimezone(tz, nowIso));
  }, [data, location, nowIso]);

  if (!ready) return <LoadingState />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <MarineMap
          selected={location}
          spots={spots}
          center={location ? [location.latitude, location.longitude] : [31.8, -7.1]}
          height="h-[420px] md:h-[560px]"
          onPick={(lat, lon) => {
            setPickedPoint({ latitude: lat, longitude: lon });
            setSaveOpen(true);
          }}
          onMarkerClick={(s) => {
            setActiveLocation({
              id: s.id,
              name: s.name,
              latitude: s.latitude,
              longitude: s.longitude
            });
            void update({ defaultLocation: { id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude } });
          }}
        />

        {/* quick towns */}
        <div className="flex flex-wrap gap-1.5">
          {COASTAL_TOWNS.map((town) => (
            <button
              key={town.id}
              onClick={() => {
                setActiveLocation(town);
                void update({ defaultLocation: town });
              }}
              className="rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-700 hover:border-ocean-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200"
            >
              {town.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-navy-400">{t('map.coastalTownsNote')}</p>

        {/* save spot here */}
        {saveOpen ? (
          <Card>
            <CardHeader title={t('map.saveSpotHere')} />
            <CardBody className="space-y-3">
              <Field label={t('spots.name')}>
                <TextInput
                  value={spotName}
                  onChange={(e) => setSpotName(e.target.value)}
                  placeholder={t('spots.namePlaceholder')}
                />
              </Field>
              <Field label={t('spots.type')}>
                <Select value={spotType} onChange={(e) => setSpotType(e.target.value as LocationType)}>
                  {TYPE_OPTIONS.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`spots.type${tp[0].toUpperCase()}${tp.slice(1).replace('_', '')}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex gap-2">
                <Button
                  disabled={!spotName.trim() || !pickedPoint}
                  onClick={() => {
                    const loc = pickedPoint ?? location;
                    if (!loc) return;
                    const spot: Spot = {
                      id: newId('spot'),
                      name: spotName.trim(),
                      description: '',
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      locationType: spotType,
                      methods: [],
                      targetSpecies: [],
                      accessNotes: '',
                      privateNotes: '',
                      isFavorite: false,
                      photos: [],
                      createdAt: nowIso,
                      updatedAt: nowIso
                    };
                    void saveSpot(spot)
                      .then(() => setSpots((s) => [...s, spot].sort((a, b) => a.name.localeCompare(b.name))))
                      .finally(() => {
                        setSaveOpen(false);
                        setSpotSaved(true);
                        setSpotName('');
                        setTimeout(() => setSpotSaved(false), 2500);
                      });
                  }}
                >
                  {t('common.save')}
                </Button>
                <Button variant="ghost" onClick={() => setSaveOpen(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
              {spotSaved ? <p className="text-xs font-semibold text-emerald-600">{t('spots.saved')}</p> : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {/* side panel */}
      <div className="space-y-3">
        <Card>
          <CardHeader title={t('map.selectedPoint')} />
          <CardBody className="space-y-3">
            <LocationPicker
              value={location}
              onChange={(loc) => {
                setActiveLocation(loc);
                void update({ defaultLocation: loc });
              }}
              compact
            />
            {loading && !data ? (
              <LoadingState />
            ) : error && !data ? (
              <ErrorState message={t(error)} onRetry={retry} />
            ) : current ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <MiniTile label={t('wind.speed')} value={current.windSpeed != null ? `${formatNumber(locale, windDisplay(current.windSpeed, settings.windUnit) ?? 0)} ${windUnitLabel(settings.windUnit)}` : '—'} sub={current.windDirection != null ? t(`compass.${compassFromDegrees(current.windDirection) ?? 'n'}`) : undefined} />
                <MiniTile label={t('wind.gusts')} value={current.windGusts != null ? `${formatNumber(locale, windDisplay(current.windGusts, settings.windUnit) ?? 0)} ${windUnitLabel(settings.windUnit)}` : '—'} />
                <MiniTile label={t('wave.height')} value={current.waveHeight != null ? `${formatNumber(locale, heightDisplay(current.waveHeight, settings.distanceUnit) ?? 0)} ${heightUnitLabel(settings.distanceUnit)}` : '—'} sub={current.waveDirection != null ? t(`compass.${compassFromDegrees(current.waveDirection) ?? 'n'}`) : undefined} />
                <MiniTile label={t('wave.swell')} value={current.swellHeight != null ? `${formatNumber(locale, heightDisplay(current.swellHeight, settings.distanceUnit) ?? 0)} ${heightUnitLabel(settings.distanceUnit)}` : current.waveHeight != null ? `${formatNumber(locale, heightDisplay(current.waveHeight, settings.distanceUnit) ?? 0)} ${heightUnitLabel(settings.distanceUnit)}` : '—'} />
                <MiniTile label={t('ocean.sst')} value={current.seaSurfaceTemperature != null ? `${formatNumber(locale, current.seaSurfaceTemperature, 1)} °C` : '—'} />
                <MiniTile label={t('weather.temperature')} value={current.temperature != null ? `${formatNumber(locale, current.temperature, 1)} °C` : '—'} />
                <MiniTile label={t('weather.precip')} value={current.precipitation != null ? `${formatNumber(locale, current.precipitation, 1)} mm` : '—'} />
                <MiniTile label={t('weather.visibility')} value={current.visibility != null ? `${formatNumber(locale, current.visibility, 1)} km` : '—'} />
              </dl>
            ) : (
              <p className="text-sm text-navy-500">{t('common.noData')}</p>
            )}
            {data ? <ProviderFooter merged={data} nowIso={nowIso} /> : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MiniTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-navy-50/60 px-2.5 py-1.5 dark:border-navy-800 dark:bg-navy-950/40">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">{label}</dt>
      <dd className="ltr text-sm font-bold">{value}</dd>
      {sub ? <dd className="text-[11px] text-navy-500">{sub}</dd> : null}
    </div>
  );
}

function getActivePoint(location: { latitude: number; longitude: number } | null) {
  if (!location) return null;
  return location;
}
