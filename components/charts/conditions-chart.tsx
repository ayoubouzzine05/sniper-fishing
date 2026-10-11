'use client';

/**
 * 48h wind + wave chart (Recharts). Container is forced LTR so axes stay
 * consistent in RTL locales (requirement: charts keep LTR axes).
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import type { ConditionSnapshot } from '@/lib/models/types';
import { windDisplay, windUnitLabel, heightDisplay, heightUnitLabel } from '@/lib/units/conversion';
import { formatWallTime } from '@/lib/i18n/format';
import { useSettings } from '@/lib/hooks/use-settings';

export default function ConditionsChart({ hours }: { hours: ConditionSnapshot[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { settings } = useSettings();

  const data = hours.slice(0, 48).map((h) => ({
    time: formatWallTime(h.time),
    wind: windDisplay(h.windSpeed, settings.windUnit),
    gusts: windDisplay(h.windGusts, settings.windUnit),
    wave: heightDisplay(h.waveHeight, settings.distanceUnit)
  }));

  return (
    <div className="chart-ltr h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis yAxisId="wind" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="wave" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            labelStyle={{ fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="wind"
            type="monotone"
            dataKey="wind"
            name={`${t('wind.speed')} (${windUnitLabel(settings.windUnit)})`}
            stroke="#21aca4"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="wind"
            type="monotone"
            dataKey="gusts"
            name={`${t('wind.gusts')} (${windUnitLabel(settings.windUnit)})`}
            stroke="#9aa9b5"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="wave"
            type="monotone"
            dataKey="wave"
            name={`${t('wave.height')} (${heightUnitLabel(settings.distanceUnit)})`}
            stroke="#3c75ad"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
