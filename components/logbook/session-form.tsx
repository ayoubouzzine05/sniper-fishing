'use client';

/**
 * Session form: date/times/location/method/species/bait + catch editor
 * (species, weight, length, kept, optional photo < 500 KB, note) and an
 * auto-captured conditions snapshot from the live forecast.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { PhotosField } from '@/components/ui/photos-field';
import { useSettings } from '@/lib/hooks/use-settings';
import { useForecast } from '@/lib/hooks/use-forecast';
import { snapshotNearestNow } from '@/lib/providers/merge';
import { saveSession } from '@/lib/persistence/repositories';
import { listSpots } from '@/lib/persistence/repositories';
import { newId } from '@/lib/persistence/db';
import { FISHING_METHODS } from '@/lib/models/types';
import type { CatchEntry, FishingMethod, FishingSession, Spot } from '@/lib/models/types';
import { IconPlus, IconX } from '@/components/layout/icons';

const MAX_PHOTO_BYTES = 500 * 1024;

export function SessionForm({
  existing,
  onSaved,
  onCancel
}: {
  existing: FishingSession | null;
  onSaved: (s: FishingSession) => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, ready, update } = useSettings();
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(existing?.startTime ?? '06:00');
  const [endTime, setEndTime] = useState(existing?.endTime ?? '11:00');
  const [method, setMethod] = useState<FishingMethod>(existing?.method ?? settings.defaultMethod);
  const [species, setSpecies] = useState(existing?.targetSpecies.join(', ') ?? '');
  const [bait, setBait] = useState(existing?.baitOrLure ?? '');
  const [equipment, setEquipment] = useState(existing?.equipmentNotes ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [spotId, setSpotId] = useState(existing?.spotId ?? '');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [catches, setCatches] = useState<CatchEntry[]>(existing?.catches ?? []);
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [zeroCatch, setZeroCatch] = useState(existing ? existing.catches.length === 0 : false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const location = settings.defaultLocation;
  const { data } = useForecast(location, 1);

  useEffect(() => {
    listSpots().then(setSpots).catch(() => setSpots([]));
  }, []);

  const conditionSnapshot = useMemo(() => {
    if (!data || !location) return null;
    const h = snapshotNearestNow(data.hours, new Date().toISOString().slice(0, 16));
    if (!h) return null;
    return h;
  }, [data, location]);

  function addCatch() {
    if (zeroCatch) setZeroCatch(false);
    setCatches((c) => [
      ...c,
      { id: newId('catch'), species: '', weightGrams: null, lengthCm: null, kept: true, note: '', photoDataUrl: null }
    ]);
  }

  function updateCatch(id: string, patch: Partial<CatchEntry>) {
    setCatches((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removeCatch(id: string) {
    setCatches((c) => c.filter((x) => x.id !== id));
  }

  async function onPhoto(id: string, file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('logbook.photoTooLarge'));
      return;
    }
    setPhotoError(null);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    updateCatch(id, { photoDataUrl: dataUrl });
  }

  async function submit() {
    if (!location || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const chosenSpot = spots.find((s) => s.id === spotId) ?? null;
    const session: FishingSession = {
      id: existing?.id ?? newId('session'),
      date,
      startTime,
      endTime,
      location: chosenSpot
        ? { id: chosenSpot.id, name: chosenSpot.name, latitude: chosenSpot.latitude, longitude: chosenSpot.longitude }
        : location,
      spotId: chosenSpot?.id ?? null,
      method,
      targetSpecies: species.split(',').map((s) => s.trim()).filter(Boolean),
      baitOrLure: bait,
      equipmentNotes: equipment,
      notes,
      conditions:
        conditionSnapshot && !existing
          ? {
              windSpeed: conditionSnapshot.windSpeed,
              windGusts: conditionSnapshot.windGusts,
              waveHeight: conditionSnapshot.waveHeight,
              precipitation: conditionSnapshot.precipitation,
              temperature: conditionSnapshot.temperature,
              weatherCode: conditionSnapshot.weatherCode,
              capturedAt: now,
              source: 'Open-Meteo'
            }
          : existing?.conditions ?? null,
      catches: zeroCatch ? [] : catches.filter((c) => c.species.trim().length > 0),
      photos,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    try {
      const saved = await saveSession(session);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <Card>
      <CardHeader title={existing ? t('logbook.editSession') : t('logbook.newSession')} />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('logbook.date')}>
            <TextInput type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('logbook.start')}>
            <TextInput type="time" dir="ltr" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label={t('logbook.end')}>
            <TextInput type="time" dir="ltr" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('logbook.method')}>
            <Select value={method} onChange={(e) => setMethod(e.target.value as FishingMethod)}>
              {FISHING_METHODS.map((m) => (
                <option key={m} value={m}>{t(`methods.${m}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('logbook.location')}>
            <Select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
              <option value="">{location?.name ?? '—'}</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('logbook.species')}>
            <TextInput value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Bogue, Loup…" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('logbook.bait')}>
            <TextInput value={bait} onChange={(e) => setBait(e.target.value)} placeholder="Vermillon / leurre blanc 8cm" />
          </Field>
          <Field label={t('logbook.equipment')}>
            <TextInput value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          </Field>
        </div>

        {conditionSnapshot && !existing ? (
          <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500 dark:bg-navy-950/50 dark:text-navy-400">
            📡 {t('logbook.conditionsSnapshot')}:{' '}
            {conditionSnapshot.windSpeed != null ? `wind ${conditionSnapshot.windSpeed.toFixed(0)} km/h` : 'wind —'}
            {', '}
            {conditionSnapshot.waveHeight != null ? `wave ${conditionSnapshot.waveHeight.toFixed(2)} m` : 'wave —'}
          </p>
        ) : null}

        {/* catch editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="label-base mb-0">{t('logbook.catches')}</p>
            <Button variant="secondary" onClick={addCatch} disabled={zeroCatch}>
              <IconPlus className="h-4 w-4" />
              {t('logbook.addCatch')}
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={zeroCatch}
              onChange={(e) => setZeroCatch(e.target.checked)}
              className="h-4 w-4 accent-ocean-600"
            />
            {t('logbook.zeroCatch')}
          </label>

          {photoError ? <p className="text-xs font-semibold text-red-600" role="alert">{photoError}</p> : null}

          {zeroCatch ? null : (
            <ul className="space-y-2">
              {catches.map((c) => (
                <li key={c.id} className="rounded-lg border border-navy-200 p-2.5 dark:border-navy-700">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Field label={t('logbook.catchSpecies')}>
                      <TextInput value={c.species} onChange={(e) => updateCatch(c.id, { species: e.target.value })} />
                    </Field>
                    <Field label={t('logbook.weight')}>
                      <TextInput
                        dir="ltr" inputMode="decimal"
                        value={c.weightGrams ?? ''}
                        onChange={(e) =>
                          updateCatch(c.id, { weightGrams: e.target.value === '' ? null : Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label={t('logbook.length')}>
                      <TextInput
                        dir="ltr" inputMode="decimal"
                        value={c.lengthCm ?? ''}
                        onChange={(e) =>
                          updateCatch(c.id, { lengthCm: e.target.value === '' ? null : Number(e.target.value) })
                        }
                      />
                    </Field>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={c.kept}
                          onChange={(e) => updateCatch(c.id, { kept: e.target.checked })}
                          className="h-4 w-4 accent-ocean-600"
                        />
                        {t('logbook.kept')}
                      </label>
                      <Button variant="ghost" className="ms-auto px-2 py-1 text-red-600" onClick={() => removeCatch(c.id)}>
                        <IconX className="h-4 w-4" />
                      </Button>
                    </div>
                    <Field label={t('logbook.photo')}>
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-xs file:me-2 file:rounded-md file:border-0 file:bg-ocean-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onPhoto(c.id, f);
                          e.target.value = '';
                        }}
                      />
                    </Field>
                    {c.photoDataUrl ? (
                      <img src={c.photoDataUrl} alt="" className="h-16 w-16 rounded object-cover" />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <PhotosField
          label={t('logbook.sessionPhotos')}
          photos={photos}
          onChange={setPhotos}
          testId="session-photos"
        />

        <Field label={t('logbook.notes')}>
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-1">
          <Button onClick={() => void submit()} disabled={saving || !location}>
            {t('common.save')}
          </Button>
          <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        </div>
      </CardBody>
    </Card>
  );
}
