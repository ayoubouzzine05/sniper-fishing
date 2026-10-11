/**
 * Sniper Fishing — safety assessment.
 *
 * SAFETY FIRST: an 'unfavorable' or 'dangerous' status always overrides any
 * fishing-suitability score (enforced in the UI layer: the app shows
 * "do not go out" and suppresses go-recommendations).
 *
 * Thresholds are conservative defaults, configurable per deployment and per
 * method (docs/SCORING.md). They are heuristics, not an official forecast —
 * the UI always labels app-generated alerts as such and distinguishes them
 * from official warnings.
 */
import type {
  ConditionSnapshot,
  MarineWarning,
  SafetyAlert,
  SafetyAssessment,
  SafetyStatus,
  SafetyThresholds,
  FishingMethod
} from '@/lib/models/types';

/**
 * Conservative defaults per method (metric units).
 * Kayak and boat are the strictest; harbor the most forgiving.
 */
export const SAFETY_THRESHOLDS: Record<FishingMethod, SafetyThresholds> = {
  kayak: {
    windCaution: 18,
    windUnfavorable: 28,
    windDangerous: 40,
    gustDangerous: 55,
    waveCaution: 0.8,
    waveUnfavorable: 1.5,
    swellCaution: 1.2,
    rainHeavyPerHour: 8,
    visibilityCaution: 3,
    visibilityUnfavorable: 1.5,
    nightCaution: true
  },
  boat: {
    windCaution: 25,
    windUnfavorable: 35,
    windDangerous: 50,
    gustDangerous: 60,
    waveCaution: 1.0,
    waveUnfavorable: 2.0,
    swellCaution: 1.5,
    rainHeavyPerHour: 8,
    visibilityCaution: 5,
    visibilityUnfavorable: 2,
    nightCaution: true
  },
  rock: {
    windCaution: 30,
    windUnfavorable: 40,
    windDangerous: 55,
    gustDangerous: 60,
    waveCaution: 1.2,
    waveUnfavorable: 2.0,
    swellCaution: 1.5,
    rainHeavyPerHour: 8,
    visibilityCaution: 2,
    visibilityUnfavorable: 1,
    nightCaution: true
  },
  shore_spinning: {
    windCaution: 30,
    windUnfavorable: 40,
    windDangerous: 55,
    gustDangerous: 60,
    waveCaution: 1.0,
    waveUnfavorable: 1.8,
    swellCaution: 1.3,
    rainHeavyPerHour: 8,
    visibilityCaution: 2,
    visibilityUnfavorable: 1,
    nightCaution: false
  },
  float: {
    windCaution: 30,
    windUnfavorable: 40,
    windDangerous: 55,
    gustDangerous: 60,
    waveCaution: 0.8,
    waveUnfavorable: 1.5,
    swellCaution: 1.2,
    rainHeavyPerHour: 8,
    visibilityCaution: 2,
    visibilityUnfavorable: 1,
    nightCaution: false
  },
  harbor: {
    windCaution: 35,
    windUnfavorable: 45,
    windDangerous: 60,
    gustDangerous: 70,
    waveCaution: 0.8,
    waveUnfavorable: 1.5,
    swellCaution: 1.0,
    rainHeavyPerHour: 10,
    visibilityCaution: 2,
    visibilityUnfavorable: 1,
    nightCaution: false
  },
  surfcasting: {
    windCaution: 35,
    windUnfavorable: 45,
    windDangerous: 60,
    gustDangerous: 70,
    waveCaution: 1.5,
    waveUnfavorable: 2.5,
    swellCaution: 1.8,
    rainHeavyPerHour: 10,
    visibilityCaution: 2,
    visibilityUnfavorable: 1,
    nightCaution: false
  }
};

const SEVERITY_RANK: Record<SafetyStatus, number> = {
  favorable: 0,
  insufficient_data: 1,
  caution: 2,
  unfavorable: 3,
  dangerous: 4
};

export interface AssessInput {
  hours: ConditionSnapshot[];
  method: FishingMethod;
  warnings: MarineWarning[];
  thresholds?: SafetyThresholds;
  /** ISO instant; injected for deterministic tests. */
  nowIso: string;
}

export function assessSafety(input: AssessInput): SafetyAssessment {
  const { hours, method, warnings, nowIso } = input;
  const th = input.thresholds ?? SAFETY_THRESHOLDS[method];
  const alerts: SafetyAlert[] = [];

  const worst = {
    wind: Math.max(0, ...hours.map((h) => h.windSpeed ?? 0)),
    gusts: Math.max(0, ...hours.map((h) => h.windGusts ?? 0)),
    wave: Math.max(0, ...hours.map((h) => h.waveHeight ?? 0)),
    swell: Math.max(0, ...hours.map((h) => h.swellHeight ?? h.waveHeight ?? 0)),
    rain: Math.max(0, ...hours.map((h) => h.precipitation ?? 0)),
    thunder: hours.some((h) => (h.thunderstorm ?? 0) > 0),
    visMin: minNonNull(hours.map((h) => h.visibility)),
    anyNight: hours.some((h) => h.isDaylight === false)
  };

  // Wind — worst value across the session.
  if (worst.wind >= th.windDangerous) {
    alerts.push({ key: 'aWindDangerous', severity: 'dangerous', params: { v: worst.wind, lim: th.windDangerous }, official: false });
  } else if (worst.wind >= th.windUnfavorable) {
    alerts.push({ key: 'aWindUnfavorable', severity: 'unfavorable', params: { v: worst.wind, lim: th.windUnfavorable, method: 'X' }, official: false });
  } else if (worst.wind >= th.windCaution) {
    alerts.push({ key: 'aWindCaution', severity: 'caution', params: { v: worst.wind, lim: th.windCaution, method: 'X' }, official: false });
  }

  // Kayak-specific extra warning (the generic wind alert may not fire yet).
  if (method === 'kayak' && worst.wind >= th.windCaution && worst.wind < th.windUnfavorable) {
    alerts.push({ key: 'aKayakWind', severity: 'caution', params: { v: worst.wind, lim: th.windCaution }, official: false });
  }

  // Gusts.
  if (worst.gusts >= th.gustDangerous) {
    alerts.push({ key: 'aGustDangerous', severity: 'dangerous', params: { v: worst.gusts, lim: th.gustDangerous }, official: false });
  }

  // Waves.
  if (worst.wave >= th.waveUnfavorable) {
    alerts.push({ key: 'aWaveUnfavorable', severity: 'unfavorable', params: { v: worst.wave, lim: th.waveUnfavorable }, official: false });
  } else if (worst.wave >= th.waveCaution) {
    alerts.push({ key: 'aWaveCaution', severity: 'caution', params: { v: worst.wave, lim: th.waveCaution }, official: false });
  }

  // Swell.
  if (worst.swell >= th.swellCaution) {
    alerts.push({ key: 'aSwellCaution', severity: 'caution', params: { v: worst.swell, lim: th.swellCaution }, official: false });
  }

  // Rain / thunder.
  if (worst.thunder) {
    alerts.push({ key: 'aThunderstorm', severity: 'dangerous', params: {}, official: false });
  }
  if (worst.rain >= th.rainHeavyPerHour) {
    alerts.push({ key: 'aRainHeavy', severity: 'unfavorable', params: { v: worst.rain }, official: false });
  }

  // Visibility.
  if (worst.visMin != null) {
    if (worst.visMin <= th.visibilityUnfavorable) {
      alerts.push({ key: 'aVisUnfavorable', severity: 'unfavorable', params: { v: worst.visMin, lim: th.visibilityUnfavorable }, official: false });
    } else if (worst.visMin <= th.visibilityCaution) {
      alerts.push({ key: 'aVisCaution', severity: 'caution', params: { v: worst.visMin, lim: th.visibilityCaution }, official: false });
    }
  }

  // Night.
  if (th.nightCaution && worst.anyNight) {
    alerts.push({ key: 'aNight', severity: 'caution', params: {}, official: false });
  }

  // Official warnings always outrank heuristics.
  for (const w of warnings) {
    const severity: SafetyAlert['severity'] =
      w.severity === 'warning' ? 'dangerous' : w.severity === 'watch' ? 'unfavorable' : 'caution';
    alerts.push({ key: 'aOfficialWarning', severity, params: {}, official: true });
  }

  // Data completeness.
  const completeness =
    hours.length === 0
      ? 0
      : hours.reduce((a, h) => a + h.dataCompleteness, 0) / hours.length;

  let status: SafetyStatus;
  if (hours.length === 0) {
    status = 'insufficient_data';
  } else if (completeness < 0.5 && !alerts.some((a) => a.official)) {
    status = 'insufficient_data';
  } else {
    status = alerts.reduce<SafetyStatus>((acc, a) => {
      const map: Record<SafetyAlert['severity'], SafetyStatus> = {
        caution: 'caution',
        unfavorable: 'unfavorable',
        dangerous: 'dangerous'
      };
      const s = map[a.severity];
      return SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc;
    }, 'favorable');
  }

  return {
    status,
    alerts,
    doNotGoOut: status === 'unfavorable' || status === 'dangerous',
    generatedAt: nowIso,
    completeness
  };
}

function minNonNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return Math.min(...present);
}
