'use client';

/**
 * Catch Logbook: sessions list, session editor, JSON/CSV export.
 * Analytics tab shows personal statistics (own records only).
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import { SessionForm } from '@/components/logbook/session-form';
import AnalyticsView from '@/components/logbook/analytics-view';
import { listSessions, deleteSession } from '@/lib/persistence/repositories';
import { toCsv, downloadText, exportJson } from '@/lib/persistence/export';
import type { FishingSession } from '@/lib/models/types';
import { IconPlus } from '@/components/layout/icons';
import { formatNumber, formatWallDate } from '@/lib/i18n/format';
import { useSettings } from '@/lib/hooks/use-settings';

export default function LogbookPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<FishingSession[] | null>(null);
  const [editing, setEditing] = useState<FishingSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState<'sessions' | 'analytics'>('sessions');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const exported = useMemo(() => sessions ?? [], [sessions]);

  if (sessions === null) return <LoadingState />;

  function flashSaved(s: FishingSession) {
    setSessions((prev) => {
      if (!prev) return [s];
      const exists = prev.some((x) => x.id === s.id);
      const next = exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev];
      return next.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    });
    setFormOpen(false);
    setEditing(null);
    setMessage(t('logbook.saved'));
    setTimeout(() => setMessage(null), 2500);
  }

  async function remove(s: FishingSession) {
    if (!confirm(t('logbook.deleteConfirm'))) return;
    await deleteSession(s.id);
    setSessions((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
  }

  function exportCsv() {
    const csv = toCsv(exported, [
      { header: 'date', value: (s) => s.date },
      { header: 'start', value: (s) => s.startTime },
      { header: 'end', value: (s) => s.endTime },
      { header: 'location', value: (s) => s.location.name },
      { header: 'method', value: (s) => s.method },
      { header: 'species_target', value: (s) => s.targetSpecies.join('|') },
      { header: 'bait_or_lure', value: (s) => s.baitOrLure },
      { header: 'catch_count', value: (s) => s.catches.length },
      { header: 'catches', value: (s) => s.catches.map((c) => `${c.species}:${c.weightGrams ?? ''}g`).join('|') },
      { header: 'wind_kmh', value: (s) => s.conditions?.windSpeed ?? '' },
      { header: 'wave_m', value: (s) => s.conditions?.waveHeight ?? '' },
      { header: 'notes', value: (s) => s.notes }
    ]);
    downloadText('sniper-fishing-sessions.csv', csv, 'text/csv');
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">{t('nav.logbook')}</h1>
        <div className="ms-auto flex flex-wrap gap-1.5">
          <Button variant="secondary" onClick={() => exportJson('sniper-fishing-sessions.json', exported)}>
            {t('logbook.exportJson')}
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            {t('logbook.exportCsv')}
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <IconPlus className="h-4 w-4" />
            {t('logbook.newSession')}
          </Button>
        </div>
      </div>

      <div className="no-print flex gap-1 rounded-lg bg-navy-100 p-1 dark:bg-navy-900">
        {(['sessions', 'analytics'] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            aria-pressed={tab === tb}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition ${
              tab === tb ? 'bg-white text-navy-900 shadow dark:bg-navy-800 dark:text-navy-50' : 'text-navy-500 dark:text-navy-400'
            }`}
          >
            {tb === 'sessions' ? t('logbook.sessions') : t('logbook.analytics')}
            </button>
          ))}
        </div>

      {message ? (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{message}</p>
      ) : null}

      {tab === 'analytics' ? (
        <AnalyticsView sessions={exported} />
      ) : (
        <>
          {formOpen ? (
            <div className="no-print">
              <SessionForm
                existing={editing}
                onSaved={flashSaved}
                onCancel={() => { setFormOpen(false); setEditing(null); }}
              />
            </div>
          ) : null}

          {exported.length === 0 && !formOpen ? (
            <EmptyState
              title={t('logbook.empty')}
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <IconPlus className="h-4 w-4" />
                  {t('logbook.newSession')}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {exported.map((s) => (
                <li key={s.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">
                              {formatWallDate(locale, s.date, { weekday: true })}
                              <span className="ltr ms-2 text-sm font-semibold text-navy-500">
                                {s.startTime}–{s.endTime}
                              </span>
                            </h3>
                            <Badge tone="info">{t(`methods.${s.method}`)}</Badge>
                            {s.catches.length === 0 ? <Badge tone="neutral">{t('logbook.zeroCatch')}</Badge> : null}
                          </div>
                          <p className="mt-0.5 text-sm text-navy-600 dark:text-navy-300">{s.location.name}</p>
                          {s.targetSpecies.length > 0 ? (
                            <p className="text-xs text-navy-500">{s.targetSpecies.join(', ')}</p>
                          ) : null}
                          {s.baitOrLure ? <p className="text-xs text-navy-500">{s.baitOrLure}</p> : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-2xl font-extrabold text-ocean-700 dark:text-ocean-300 ltr">
                            {formatNumber(locale, s.catches.length, 0)}
                          </span>
                          <span className="ltr text-[11px] font-semibold text-navy-400 dark:text-navy-500">
                            {t('logbook.catchCount', { n: s.catches.length })}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => { setEditing(s); setFormOpen(true); }}>
                              {t('common.edit')}
                            </Button>
                            <Button variant="ghost" className="px-2 py-1 text-xs text-red-600 dark:text-red-400" onClick={() => void remove(s)}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {s.catches.length > 0 ? (
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                          {s.catches.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 rounded-lg bg-navy-50 px-2.5 py-1.5 text-xs dark:bg-navy-950/40">
                              {c.photoDataUrl ? (
                                <img src={c.photoDataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                              ) : (
                                <span aria-hidden className="text-base">🐟</span>
                              )}
                              <span className="min-w-0 flex-1 truncate font-semibold">{c.species}</span>
                              {c.weightGrams != null ? (
                                <span className="ltr text-navy-500">{formatNumber(locale, c.weightGrams, 0)} g</span>
                              ) : null}
                              {c.lengthCm != null ? (
                                <span className="ltr text-navy-500">{formatNumber(locale, c.lengthCm, 0)} cm</span>
                              ) : null}
                              {c.kept ? <Badge tone="good">✓</Badge> : <Badge tone="neutral">↩</Badge>}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {s.photos.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.photos.map((p, i) => (
                            <img
                              key={i}
                              src={p}
                              alt={t('logbook.sessionPhotos')}
                              className="h-12 w-12 rounded-lg border border-navy-200 object-cover dark:border-navy-700"
                            />
                          ))}
                        </div>
                      ) : null}

                      {s.notes ? <p className="mt-2 text-xs text-navy-500">{s.notes}</p> : null}
                      {s.conditions ? (
                        <p className="mt-1 text-[11px] text-navy-400">
                          📡 {t('logbook.conditionsSnapshot')}: {s.conditions.windSpeed != null ? `${s.conditions.windSpeed.toFixed(0)} km/h` : '—'} ·{' '}
                          {s.conditions.waveHeight != null ? `${s.conditions.waveHeight.toFixed(2)} m` : '—'} · {s.conditions.source}
                        </p>
                      ) : null}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
