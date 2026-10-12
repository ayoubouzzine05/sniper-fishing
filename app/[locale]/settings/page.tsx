'use client';

/**
 * Settings: language, theme, units, default method/location, data &
 * privacy (export / import / wipe), optional Supabase account, about +
 * attribution.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import LanguageSwitcher from '@/components/layout/language-switcher';
import LocationPicker from '@/components/common/location-picker';
import { useSettings } from '@/lib/hooks/use-settings';
import { setActiveLocation } from '@/lib/state/location-store';
import {
  wipeAllData,
  listSpots,
  listSessions,
  listPlans,
  getSettings,
  saveSpot,
  saveSession,
  savePlan
} from '@/lib/persistence/repositories';
import { exportJson, readFileAsText } from '@/lib/persistence/export';
import { BackupSchema } from '@/lib/validation/schemas';
import { FISHING_METHODS } from '@/lib/models/types';
import type { AppLanguage, FishingMethod, ThemeMode, WindUnit, DistanceUnit, TempUnit } from '@/lib/models/types';
import { isSupabaseConfigured, getSupabaseClient, supabaseSessionEmail } from '@/lib/supabase/client';

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [supaEmail, setSupaEmail] = useState<string | null>(null);
  const [supaError, setSupaError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) void supabaseSessionEmail().then(setSupaEmail);
  }, [authBusy]);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  async function changeLanguage(next: AppLanguage) {
    await update({ language: next });
    router.replace(pathname, { locale: next });
  }

  async function clearAll() {
    if (!confirm(t('settings.clearConfirm'))) return;
    await wipeAllData();
    flash(t('settings.cleared'));
  }

  async function importAll(file: File) {
    try {
      const text = await readFileAsText(file);
      const parsed = BackupSchema.parse(JSON.parse(text));
      for (const s of parsed.spots) await saveSpot(s);
      for (const s of parsed.sessions) await saveSession(s);
      for (const p of parsed.plans) await savePlan(p);
      if (parsed.settings) await update(parsed.settings);
      flash(t('settings.syncDone'));
    } catch {
      flash(t('settings.importAllError'));
    }
  }

  async function auth(action: 'in' | 'up') {
    const c = getSupabaseClient();
    if (!c) return;
    setAuthBusy(true);
    setSupaError(null);
    try {
      if (action === 'in') {
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await c.auth.signUp({ email, password });
        if (error) throw error;
      }
      const em = await supabaseSessionEmail();
      setSupaEmail(em);
      setAuthOpen(false);
      setEmail('');
      setPassword('');
      // Initial sync: push local data to the user's account.
      await syncToCloud();
    } catch {
      setSupaError(t('settings.authError'));
    } finally {
      setAuthBusy(false);
    }
  }

  async function syncToCloud() {
    const c = getSupabaseClient();
    const em = await supabaseSessionEmail();
    if (!c || !em) return;
    const userId = (await supabaseSessionEmail()) ? em : null;
    if (!userId) return;
    try {
      const spots = await listSpots();
      const sessions = await listSessions();
      // The local models are camelCase, the migration columns are
      // snake_case — map explicitly. Keep in sync with
      // supabase/migrations/0001_init.sql.
      if (spots.length > 0) {
        await c.from('spots').upsert(
          spots.map((s) => ({
            user_id: userId,
            id: s.id,
            name: s.name,
            description: s.description,
            latitude: s.latitude,
            longitude: s.longitude,
            location_type: s.locationType,
            methods: s.methods,
            target_species: s.targetSpecies,
            access_notes: s.accessNotes,
            private_notes: s.privateNotes,
            is_favorite: s.isFavorite,
            photos: s.photos,
            created_at: s.createdAt,
            updated_at: s.updatedAt
          })),
          { onConflict: 'user_id,id' }
        );
      }
      if (sessions.length > 0) {
        await c.from('sessions').upsert(
          sessions.map((s) => ({
            user_id: userId,
            id: s.id,
            date: s.date,
            start_time: s.startTime,
            end_time: s.endTime,
            location: s.location,
            spot_id: s.spotId,
            method: s.method,
            target_species: s.targetSpecies,
            bait_or_lure: s.baitOrLure,
            equipment_notes: s.equipmentNotes,
            notes: s.notes,
            conditions: s.conditions,
            catches: s.catches,
            photos: s.photos,
            created_at: s.createdAt,
            updated_at: s.updatedAt
          })),
          { onConflict: 'user_id,id' }
        );
      }
      flash(t('settings.syncDone'));
    } catch {
      flash(t('settings.syncFailed'));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-extrabold">{t('nav.settings')}</h1>
      {message ? <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{message}</p> : null}

      {/* language */}
      <Card>
        <CardHeader title={t('settings.language')} />
        <CardBody>
          <LanguageSwitcher />
          <p className="mt-2 text-xs text-navy-400">{t('onboarding.note')}</p>
        </CardBody>
      </Card>

      {/* appearance + units */}
      <Card>
        <CardHeader title={`${t('settings.theme')} · ${t('settings.units')}`} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('settings.theme')}>
              <Select value={settings.theme} onChange={(e) => void update({ theme: e.target.value as ThemeMode })}>
                <option value="light">{t('settings.themeLight')}</option>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="system">{t('settings.themeSystem')}</option>
              </Select>
            </Field>
            <Field label={t('settings.windUnit')}>
              <Select value={settings.windUnit} onChange={(e) => void update({ windUnit: e.target.value as WindUnit })}>
                <option value="kmh">{t('settings.windUnitKmh')}</option>
                <option value="knots">{t('settings.windUnitKnots')}</option>
                <option value="ms">{t('settings.windUnitMs')}</option>
              </Select>
            </Field>
            <Field label={t('settings.tempUnit')}>
              <Select value={settings.tempUnit} onChange={(e) => void update({ tempUnit: e.target.value as TempUnit })}>
                <option value="celsius">{t('settings.tempC')}</option>
                <option value="fahrenheit">{t('settings.tempF')}</option>
              </Select>
            </Field>
            <Field label={t('settings.distanceUnit')}>
              <Select value={settings.distanceUnit} onChange={(e) => void update({ distanceUnit: e.target.value as DistanceUnit })}>
                <option value="metric">{t('settings.metric')}</option>
                <option value="imperial">{t('settings.imperial')}</option>
              </Select>
            </Field>
            <Field label={t('settings.defaultMethod')}>
              <Select value={settings.defaultMethod} onChange={(e) => void update({ defaultMethod: e.target.value as FishingMethod })}>
                {FISHING_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`methods.${m}`)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* default location */}
      <Card>
        <CardHeader title={t('settings.defaultLocation')} />
        <CardBody>
          <LocationPicker
            value={settings.defaultLocation}
            onChange={(loc) => {
              setActiveLocation(loc);
              void update({ defaultLocation: loc });
            }}
            compact
          />
        </CardBody>
      </Card>

      {/* data & privacy */}
      <Card>
        <CardHeader title={t('settings.data')} />
        <CardBody className="space-y-3">
          <p className="text-xs text-navy-500 dark:text-navy-400">{t('settings.storageNote')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const backup = {
                  app: 'sniper-fishing' as const,
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  settings: await getSettings(),
                  spots: await listSpots(),
                  sessions: await listSessions(),
                  plans: await listPlans()
                };
                exportJson('sniper-fishing-backup.json', backup);
              }}
            >
              {t('settings.exportAll')}
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {t('settings.importAll')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importAll(f);
                e.target.value = '';
              }}
            />
            <Button variant="danger" onClick={() => void clearAll()}>
              {t('settings.clearAll')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* account */}
      <Card>
        <CardHeader title={t('settings.account')} />
        <CardBody className="space-y-3">
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-navy-500 dark:text-navy-400">{t('settings.accountNotConfigured')}</p>
          ) : supaEmail ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t('settings.signedInAs', { email: supaEmail })}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void syncToCloud()}>
                  {t('settings.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const c = getSupabaseClient();
                    if (c) await c.auth.signOut();
                    setSupaEmail(null);
                  }}
                >
                  {t('settings.signOut')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {!authOpen ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setAuthOpen(true)}>{t('settings.signIn')}</Button>
                  <Button variant="ghost" onClick={() => setAuthOpen(true)}>{t('settings.signUp')}</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Field label={t('settings.email')}>
                    <TextInput dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label={t('settings.password')}>
                    <TextInput dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                  {supaError ? <p className="text-xs font-semibold text-red-600" role="alert">{supaError}</p> : null}
                  <div className="flex gap-2">
                    <Button onClick={() => void auth('in')} disabled={authBusy || !email || password.length < 8}>
                      {t('settings.signIn')}
                    </Button>
                    <Button variant="secondary" onClick={() => void auth('up')} disabled={authBusy || !email || password.length < 8}>
                      {t('settings.signUp')}
                    </Button>
                    <Button variant="ghost" onClick={() => setAuthOpen(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* about */}
      <Card>
        <CardHeader title={t('settings.about')} />
        <CardBody className="space-y-2 text-xs text-navy-500 dark:text-navy-400">
          <p>{t('settings.version')} 0.1.0 · Sniper Fishing — open source (MIT)</p>
          <p>{t('settings.attribution')}</p>
          <p>{t('settings.scoreDisclaimer')}</p>
          <p>{t('settings.tideDisclaimer')}</p>
          <p>{t('safety.disclaimer')}</p>
        </CardBody>
      </Card>
    </div>
  );
}
