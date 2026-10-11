'use client';

/**
 * Personal analytics over the user's own records only.
 * All comparisons with < 3 samples are flagged as insufficient; the
 * conditions view is explicitly labeled correlation, not causation.
 */
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import type { FishingSession } from '@/lib/models/types';
import {
  MIN_SAMPLES_FOR_COMPARISON,
  sessionsPerMonth,
  catchBySpecies,
  totalCatchRate,
  resultsByMethod,
  resultsByLocation,
  baitPerformance,
  successfulSessionConditions
} from '@/lib/logbook/analytics';
import { formatNumber } from '@/lib/i18n/format';

export default function AnalyticsView({ sessions }: { sessions: FishingSession[] }) {
  const t = useTranslations('logbook');
  const locale = useLocale();

  const data = useMemo(() => {
    return {
      months: sessionsPerMonth(sessions),
      species: catchBySpecies(sessions),
      rate: totalCatchRate(sessions),
      methods: resultsByMethod(sessions),
      locations: resultsByLocation(sessions),
      baits: baitPerformance(sessions),
      cond: successfulSessionConditions(sessions)
    };
  }, [sessions]);

  if (sessions.length === 0) {
    return <EmptyState title={t('noSessionsForAnalytics')} />;
  }

  return (
    <div className="space-y-4">
      {/* headline stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('sessions')} value={formatNumber(locale, sessions.length, 0)} />
        <Stat label={t('catchBySpecies')} value={formatNumber(locale, data.rate.fish, 0)} />
        <Stat
          label={t('catchRate')}
          value={
            data.rate.perHour != null
              ? `${formatNumber(locale, data.rate.perHour, 1)}/h`
              : '—'
          }
          sub={t('rateValue', { fish: formatNumber(locale, data.rate.fish, 0), hours: formatNumber(locale, data.rate.hours, 1) })}
        />
      </div>

      {/* sessions per month */}
      <Card>
        <CardHeader title={t('sessionsPerMonth')} />
        <CardBody>
          <div className="chart-ltr h-48 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="sessions" fill="#3c75ad" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* catch by species */}
        <Card>
          <CardHeader title={t('catchBySpecies')} />
          <CardBody>
            {data.species.length === 0 ? (
              <p className="text-sm text-navy-500">—</p>
            ) : (
              <ul className="space-y-1.5">
                {data.species.slice(0, 8).map((s) => (
                  <li key={s.species} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{s.species}</span>
                    <span className="ltr text-xs text-navy-400">
                      {s.totalWeightGrams != null ? `≈ ${formatNumber(locale, s.totalWeightGrams / 1000, 1)} kg` : ''}
                    </span>
                    <Badge tone="info" className="ltr">{formatNumber(locale, s.count, 0)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* by method */}
        <Card>
          <CardHeader title={t('byMethod')} />
          <CardBody>
            <Table
              headers={['—', t('sessions'), t('catchBySpecies')]}
              rows={data.methods.map((m) => [
                m.key,
                formatNumber(locale, m.sessions, 0),
                formatNumber(locale, m.fish, 0)
              ])}
            />
          </CardBody>
        </Card>

        {/* by location */}
        <Card>
          <CardHeader title={t('bySpot')} />
          <CardBody>
            <Table
              headers={['—', t('sessions'), t('catchBySpecies')]}
              rows={data.locations.slice(0, 6).map((m) => [
                m.key,
                formatNumber(locale, m.sessions, 0),
                formatNumber(locale, m.fish, 0)
              ])}
            />
          </CardBody>
        </Card>

        {/* bait performance */}
        <Card>
          <CardHeader title={t('baitPerformance')} />
          <CardBody>
            {data.baits.length === 0 ? (
              <p className="text-sm text-navy-500">—</p>
            ) : (
              <div className="space-y-1.5">
                <Table
                  headers={['—', t('baitSamples'), t('catchBySpecies')]}
                  rows={data.baits.map((b) => [
                    b.key,
                    formatNumber(locale, b.sessions, 0),
                    formatNumber(locale, b.fish, 0)
                  ])}
                />
                {data.baits.some((b) => b.sessions < MIN_SAMPLES_FOR_COMPARISON) ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ {t('insufficientSamples')}
                  </p>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* conditions correlation */}
      <Card>
        <CardHeader title={t('condCorrelation')} />
        <CardBody>
          {data.cond.samples === 0 ? (
            <p className="text-sm text-navy-500">—</p>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="label-base">{t('avgWind')}</span>
                <span className="ltr font-bold">
                  {data.cond.avgWind != null ? `${formatNumber(locale, data.cond.avgWind, 1)} km/h` : '—'}
                </span>
              </span>
              <span>
                <span className="label-base">{t('avgWave')}</span>
                <span className="ltr font-bold">
                  {data.cond.avgWave != null ? `${formatNumber(locale, data.cond.avgWave, 2)} m` : '—'}
                </span>
              </span>
              <span>
                <span className="label-base">{t('avgRain')}</span>
                <span className="ltr font-bold">
                  {data.cond.avgRain != null ? `${formatNumber(locale, data.cond.avgRain, 1)} mm/h` : '—'}
                </span>
              </span>
              <Badge tone="neutral" className="ltr">
                n = {formatNumber(locale, data.cond.samples, 0)}
              </Badge>
            </div>
          )}
          <p className="mt-3 text-xs text-navy-400">{t('correlationNote')}</p>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-3 shadow-card dark:border-navy-800 dark:bg-navy-900">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">{label}</div>
      <div className="ltr mt-0.5 text-xl font-extrabold">{value}</div>
      {sub ? <div className="text-[11px] text-navy-400">{sub}</div> : null}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-navy-500">
          {headers.map((h, i) => (
            <th key={i} className="px-2 py-1 text-start font-bold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-navy-100 dark:border-navy-800">
            {r.map((cell, j) => (
              <td key={j} className={`px-2 py-1 ${j === 0 ? 'font-semibold' : 'ltr text-navy-500'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
