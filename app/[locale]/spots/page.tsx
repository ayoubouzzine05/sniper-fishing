'use client';
import { Link } from '@/i18n/routing';

/**
 * Fishing Spots: create / edit / delete personal spots, map picking,
 * favorites, target species, privacy note, JSON + CSV export, JSON import.
 * Spots are stored locally only (guest mode) — never published.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import MarineMap from '@/components/map/marine-map';
import { useSettings } from '@/lib/hooks/use-settings';
import { listSpots, saveSpot, deleteSpot } from '@/lib/persistence/repositories';
import { newId } from '@/lib/persistence/db';
import { toCsv, downloadText, exportJson, readFileAsText } from '@/lib/persistence/export';
import { SpotSchema } from '@/lib/validation/schemas';
import type { FishingMethod, LocationType, Spot } from '@/lib/models/types';
import { FISHING_METHODS } from '@/lib/models/types';
import { IconPlus, IconStar } from '@/components/layout/icons';

const TYPE_OPTIONS: LocationType[] = [
  'shore', 'harbor', 'port', 'beach', 'rock', 'jetty', 'estuary', 'open_water', 'other'
];

const TYPE_KEY: Record<LocationType, string> = {
  shore: 'typeShore', harbor: 'typeHarbor', port: 'typePort', beach: 'typeBeach',
  rock: 'typeRock', jetty: 'typeJetty', estuary: 'typeEstuary',
  open_water: 'typeOpenWater', other: 'typeOther'
};

interface FormState {
  id: string | null;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  locationType: LocationType;
  methods: FishingMethod[];
  targetSpecies: string;
  accessNotes: string;
  privateNotes: string;
  isFavorite: boolean;
}

const EMPTY_FORM: FormState = {
  id: null, name: '', description: '', latitude: '', longitude: '',
  locationType: 'shore', methods: [], targetSpecies: '', accessNotes: '',
  privateNotes: '', isFavorite: false
};

export default function SpotsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings } = useSettings();
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSpots().then(setSpots).catch(() => setSpots([]));
  }, []);

  const sorted = useMemo(() => {
    if (!spots) return [];
    return [...spots].sort((a, b) =>
      Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name)
    );
  }, [spots]);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }

  function openNew() {
    setForm({
      ...EMPTY_FORM,
      latitude: settings.defaultLocation ? String(settings.defaultLocation.latitude) : '',
      longitude: settings.defaultLocation ? String(settings.defaultLocation.longitude) : ''
    });
    setShowMap(false);
  }

  function openEdit(s: Spot) {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description,
      latitude: String(s.latitude),
      longitude: String(s.longitude),
      locationType: s.locationType,
      methods: [...s.methods],
      targetSpecies: s.targetSpecies.join(', '),
      accessNotes: s.accessNotes,
      privateNotes: s.privateNotes,
      isFavorite: s.isFavorite
    });
    setShowMap(false);
  }

  async function submit() {
    if (!form) return;
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordsError(t('spots.coordsError'));
      return;
    }
    setCoordsError(null);
    const now = new Date().toISOString();
    const base: Spot = {
      id: form.id ?? newId('spot'),
      name: form.name.trim(),
      description: form.description,
      latitude: lat,
      longitude: lon,
      locationType: form.locationType,
      methods: form.methods,
      targetSpecies: form.targetSpecies.split(',').map((s) => s.trim()).filter(Boolean),
      accessNotes: form.accessNotes,
      privateNotes: form.privateNotes,
      isFavorite: form.isFavorite,
      createdAt: now,
      updatedAt: now
    };
    try {
      await saveSpot(base);
      setSpots((s) => {
        if (!s) return [base];
        const exists = s.some((x) => x.id === base.id);
        return exists ? s.map((x) => (x.id === base.id ? base : x)) : [...s, base];
      });
      setForm(null);
      flash(t('spots.saved'));
    } catch {
      setCoordsError(t('spots.coordsError'));
    }
  }

  async function remove(s: Spot) {
    if (!confirm(t('spots.deleteConfirm'))) return;
    await deleteSpot(s.id);
    setSpots((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
  }

  function exportCsv() {
    if (!spots) return;
    const csv = toCsv(spots, [
      { header: 'name', value: (s) => s.name },
      { header: 'lat', value: (s) => s.latitude },
      { header: 'lon', value: (s) => s.longitude },
      { header: 'type', value: (s) => s.locationType },
      { header: 'methods', value: (s) => s.methods.join('|') },
      { header: 'species', value: (s) => s.targetSpecies.join('|') },
      { header: 'favorite', value: (s) => (s.isFavorite ? 1 : 0) }
    ]);
    downloadText('sniper-fishing-spots.csv', csv, 'text/csv');
  }

  async function importJson(file: File) {
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.spots;
      if (!Array.isArray(arr)) throw new Error('not spots');
      const valid: Spot[] = [];
      for (const item of arr) {
        const p = SpotSchema.safeParse(item);
        if (p.success) valid.push(p.data);
      }
      if (valid.length === 0) throw new Error('none valid');
      for (const s of valid) await saveSpot(s);
      setSpots(await listSpots());
      flash(t('spots.importDone', { n: valid.length }));
    } catch {
      flash(t('spots.importError'));
    }
  }

  if (spots === null) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">{t('nav.spots')}</h1>
        <div className="ms-auto flex flex-wrap gap-1.5">
          <Button variant="secondary" onClick={() => exportJson('sniper-fishing-spots.json', spots)}>
            {t('spots.exportJson')}
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            {t('spots.exportCsv')}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            {t('spots.importJson')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = '';
            }}
          />
          <Button onClick={openNew}>
            <IconPlus className="h-4 w-4" />
            {t('spots.new')}
          </Button>
        </div>
      </div>

      <p className="rounded-lg bg-ocean-50 px-3 py-2 text-xs text-ocean-800 dark:bg-ocean-900/30 dark:text-ocean-200">
        🔒 {t('spots.privacy')}
      </p>

      {message ? (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{message}</p>
      ) : null}

      {form ? (
        <Card>
          <CardHeader title={form.id ? t('spots.edit') : t('spots.new')} />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('spots.name')}>
                <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('spots.namePlaceholder')} />
              </Field>
              <Field label={t('spots.type')}>
                <Select value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value as LocationType })}>
                  {TYPE_OPTIONS.map((tp) => (
                    <option key={tp} value={tp}>{t(`spots.${TYPE_KEY[tp]}`)}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('spots.lat')}>
                <TextInput dir="ltr" inputMode="decimal" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="35.7595" />
              </Field>
              <Field label={t('spots.lon')}>
                <TextInput dir="ltr" inputMode="decimal" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-5.8340" />
              </Field>
            </div>
            {coordsError ? <p className="text-xs font-semibold text-red-600" role="alert">{coordsError}</p> : null}

            <Button variant="secondary" onClick={() => setShowMap((v) => !v)}>{t('spots.pickOnMap')}</Button>
            {showMap ? (
              <div className="space-y-1">
                <MarineMap
                  selected={
                    Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude))
                      ? { id: 'f', name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude) }
                      : null
                  }
                  spots={[]}
                  center={
                    Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude))
                      ? [Number(form.latitude), Number(form.longitude)]
                      : [31.8, -7.1]
                  }
                  height="h-64"
                  onPick={(lat, lon) =>
                    setForm({ ...form, latitude: lat.toFixed(5), longitude: lon.toFixed(5) })
                  }
                />
                <p className="text-xs text-navy-400">{t('map.clickHint')}</p>
              </div>
            ) : null}

            <Field label={t('spots.description')}>
              <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label={t('spots.methodsLabel')} group>
              <div className="flex flex-wrap gap-1.5">
                {FISHING_METHODS.map((m) => {
                  const on = form.methods.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setForm({
                          ...form,
                          methods: on ? form.methods.filter((x) => x !== m) : [...form.methods, m]
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition
                        ${on ? 'border-ocean-500 bg-ocean-600 text-white' : 'border-navy-200 bg-white text-navy-600 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300'}`}
                    >
                      {t(`methods.${m}`)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t('spots.species')}>
              <TextInput value={form.targetSpecies} onChange={(e) => setForm({ ...form, targetSpecies: e.target.value })} placeholder="Scomber colias, Diplodus vulgaris…" />
            </Field>
            <Field label={t('spots.accessNotes')}>
              <TextArea value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} />
            </Field>
            <Field label={t('spots.privateNotes')}>
              <TextArea value={form.privateNotes} onChange={(e) => setForm({ ...form, privateNotes: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isFavorite}
                onChange={(e) => setForm({ ...form, isFavorite: e.target.checked })}
                className="h-4 w-4 accent-ocean-600"
              />
              {t('spots.favorite')}
            </label>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => void submit()} disabled={!form.name.trim()}>
                {t('common.save')}
              </Button>
              <Button variant="ghost" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {sorted.length === 0 && !form ? (
        <EmptyState
          title={t('spots.empty')}
          action={
            <Button onClick={openNew}>
              <IconPlus className="h-4 w-4" />
              {t('spots.new')}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((s) => (
            <li key={s.id}>
              <Card className="h-full">
                <CardBody className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => void saveSpot({ ...s, isFavorite: !s.isFavorite, updatedAt: new Date().toISOString() }).then(() => setSpots((p) => (p ? p.map((x) => (x.id === s.id ? { ...s, isFavorite: !s.isFavorite } : x)) : p)))}
                      aria-label={t('spots.favorite')}
                      className={s.isFavorite ? 'text-amber-500' : 'text-navy-300 hover:text-amber-500 dark:text-navy-600'}
                    >
                      <IconStar className="h-5 w-5" filled={s.isFavorite} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">{s.name}</h3>
                      <p className="ltr text-xs text-navy-500">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)} · {t(`spots.${TYPE_KEY[s.locationType]}`)}
                      </p>
                    </div>
                  </div>
                  {s.description ? <p className="line-clamp-2 text-xs text-navy-600 dark:text-navy-300">{s.description}</p> : null}
                  {s.methods.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.methods.map((m) => (
                        <Badge key={m} tone="info">{t(`methods.${m}`)}</Badge>
                      ))}
                    </div>
                  ) : null}
                  {s.targetSpecies.length > 0 ? (
                    <p className="text-xs text-navy-500">{s.targetSpecies.join(', ')}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Link
                      href={`/forecast?spot=${encodeURIComponent(s.id)}`}
                      className="rounded-lg bg-ocean-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-ocean-700"
                    >
                      {t('dashboard.viewForecast')}
                    </Link>
                    <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => openEdit(s)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400" onClick={() => void remove(s)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
