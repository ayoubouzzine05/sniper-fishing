'use client';

/**
 * Hourly suitability score across the planned session (Recharts area).
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import type { HourScore } from '@/lib/models/types';
import { formatWallTime } from '@/lib/i18n/format';

export default function ScoreChart({ hours }: { hours: HourScore[] }) {
  const t = useTranslations('score');
  const locale = useLocale();

  const data = hours.map((h) => ({ time: formatWallTime(h.time), score: h.score }));

  return (
    <div className="chart-ltr h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#21aca4" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#21aca4" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <ReferenceLine y={60} strokeOpacity={0.4} strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="score"
            name={t('title')}
            stroke="#1b8b88"
            strokeWidth={2}
            fill="url(#scoreFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
