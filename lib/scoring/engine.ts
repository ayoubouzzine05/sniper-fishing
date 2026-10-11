/**
 * Sniper Fishing — fishing suitability scoring engine.
 *
 * DESIGN RULES (see docs/SCORING.md):
 *  1. PURE and DETERMINISTIC: same inputs → same outputs. No Math.random,
 *     no Date.now() — "now" is always passed in.
 *  2. Missing data is PENALIZED (scored below neutral) and reduces the
 *     reported confidence/completeness. It is never treated as ideal.
 *  3. Different methods use different configurable profiles.
 *  4. The score is a 0–100 heuristic. It is not a probability of a catch
 *     and is not scientifically validated. The UI must say so.
 */
import type {
  ConditionSnapshot,
  HourScore,
  ScoringProfile,
  ScoreFactor,
  FactorKey
} from '@/lib/models/types';
import { clamp01, rampDown, rampUp, bandScore, rainScore } from './normalize';
import { isDaylightAt } from '@/lib/geo/wind';

export interface ScoreHourInput {
  snapshot: ConditionSnapshot;
  profile: ScoringProfile;
  sunrise: string | null;
  sunset: string | null;
  /** When the forecast data was fetched (ISO instant) — for staleness. */
  fetchedAt: string;
  /** "Now" as ISO instant — injected, never read internally. */
  nowIso: string;
  /** Tide state at this hour if a tide provider is configured. */
  tideMoving: boolean | null;
}

function fmt(v: number | null, decimals = 1): string {
  return v == null ? '—' : String(round1(v, decimals));
}

function round1(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Score a single hour. Deterministic. */
export function scoreHour(input: ScoreHourInput): HourScore {
  const { snapshot: s, profile: p, sunrise, sunset, fetchedAt, nowIso, tideMoving } = input;

  const factors: ScoreFactor[] = [];

  // --- Wind speed -----------------------------------------------------
  if (p.weights.wind > 0) {
    const v = s.windSpeed;
    let score01 = 0.5;
    let explanationKey = 'fWindModerate';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = rampDown(v, p.windSpeed.idealMax, p.windSpeed.poorAbove);
      explanationKey =
        score01 >= 0.85 ? 'fWindIdeal' : score01 >= 0.5 ? 'fWindModerate' : 'fWindHigh';
    }
    factors.push({
      key: 'wind',
      score01,
      weight: p.weights.wind,
      value: v,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Gusts ----------------------------------------------------------
  if (p.weights.gusts > 0) {
    const v = s.windGusts;
    let score01 = 0.5;
    let explanationKey = 'fGustsOk';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      const hard = p.gusts.penalizeAbove * 1.6;
      score01 = rampDown(v, p.gusts.penalizeAbove, hard);
      explanationKey = score01 >= 0.85 ? 'fGustsOk' : 'fGustsHigh';
    }
    factors.push({
      key: 'gusts',
      score01,
      weight: p.weights.gusts,
      value: v,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Wave height ----------------------------------------------------
  if (p.weights.wave > 0) {
    const v = s.waveHeight;
    let score01 = 0.5;
    let explanationKey = 'fWaveIdeal';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = rampDown(v, p.wave.idealMax, p.wave.poorAbove);
      explanationKey = score01 >= 0.85 ? 'fWaveIdeal' : 'fWaveHigh';
    }
    factors.push({
      key: 'wave',
      score01,
      weight: p.weights.wave,
      value: v,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v, 2) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Swell (height, with period as a bonus when available) ----------
  if (p.weights.swell > 0) {
    const h = s.swellHeight ?? s.waveHeight;
    const period = s.swellPeriod;
    let score01 = 0.5;
    let explanationKey = 'fSwellOk';
    let available = false;
    if (h == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      available = true;
      score01 = rampDown(h, p.swell.idealMax, p.swell.poorAbove);
      explanationKey = score01 >= 0.85 ? 'fSwellOk' : 'fSwellHigh';
      if (p.swell.periodGoodAt != null && period != null) {
        const periodScore = clamp01(period / p.swell.periodGoodAt);
        score01 = 0.75 * score01 + 0.25 * periodScore;
        if (periodScore >= 0.8) explanationKey = 'fSwellPeriodGood';
      }
    }
    factors.push({
      key: 'swell',
      score01,
      weight: p.weights.swell,
      value: h,
      detail: period,
      available,
      explanationKey,
      explanationParams: { v: fmt(h, 2) },
      positive: available && score01 >= 0.6
    });
  }

  // --- Rain -----------------------------------------------------------
  if (p.weights.rain > 0) {
    const v = s.precipitation;
    let score01 = 0.5;
    let explanationKey = 'fRainNone';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = rainScore(v, p.rain.lightMax, p.rain.heavyAt);
      explanationKey =
        score01 >= 0.9 ? 'fRainNone' : score01 >= 0.55 ? 'fRainLight' : 'fRainHeavy';
    }
    factors.push({
      key: 'rain',
      score01,
      weight: p.weights.rain,
      value: v,
      detail: s.precipitationProbability,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Visibility -----------------------------------------------------
  if (p.weights.visibility > 0) {
    const v = s.visibility;
    let score01 = 0.5;
    let explanationKey = 'fVisOk';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = rampUp(v, p.visibility.poorBelow, p.visibility.idealMin);
      explanationKey = score01 >= 0.85 ? 'fVisOk' : 'fVisLow';
    }
    factors.push({
      key: 'visibility',
      score01,
      weight: p.weights.visibility,
      value: v,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Daylight -------------------------------------------------------
  if (p.weights.daylight > 0) {
    const daylight = isDaylightAt(s.time, sunrise, sunset);
    let score01: number;
    let explanationKey: string;
    if (daylight == null) {
      // No sunrise/sunset data: neutral, do not pretend to know.
      score01 = 0.75;
      explanationKey = 'fDlDay';
    } else if (daylight) {
      const t = s.time.slice(11, 16);
      const near = (sun: string | null, minutes: number) =>
        sun != null &&
        Math.abs(minutesBetween(sun, s.time)) <= minutes;
      if (near(sunrise, p.daylight.dawnMinutes)) {
        score01 = 1;
        explanationKey = 'fDlDawn';
      } else if (near(sunset, p.daylight.duskMinutes)) {
        score01 = 1;
        explanationKey = 'fDlDusk';
      } else {
        score01 = 0.85;
        explanationKey = 'fDlDay';
      }
      void t;
    } else {
      score01 = p.daylight.nightScore;
      explanationKey = 'fDlNight';
    }
    factors.push({
      key: 'daylight',
      score01,
      weight: p.weights.daylight,
      value: daylight == null ? null : daylight ? 1 : 0,
      detail: null,
      available: daylight != null,
      explanationKey,
      explanationParams: {},
      positive: score01 >= 0.8
    });
  }

  // --- Sea temperature (only when the profile uses it) ----------------
  if (p.weights.seaTemp > 0 && p.seaTemp.band != null) {
    const [lo, hi] = p.seaTemp.band;
    const pad = Math.max(2, (hi - lo) * 0.5);
    const v = s.seaSurfaceTemperature;
    let score01 = 0.5;
    let explanationKey = 'fStOk';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = bandScore(v, lo, hi, lo - pad, hi + pad);
      explanationKey = score01 >= 0.85 ? 'fStOk' : 'fStOut';
    }
    factors.push({
      key: 'seaTemp',
      score01,
      weight: p.weights.seaTemp,
      value: v,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: { v: fmt(v) },
      positive: v != null && score01 >= 0.6
    });
  }

  // --- Tide (only when enabled AND a provider actually gives data) -----
  if (p.weights.tide > 0 && p.tide.enabled) {
    const v = tideMoving;
    let score01 = 0.5;
    let explanationKey = 'fTideMoving';
    if (v == null) {
      score01 = p.dataQuality.missingFactorScore;
      explanationKey = 'fDataMissing';
    } else {
      score01 = v ? 1 : 0.7;
      explanationKey = v ? 'fTideMoving' : 'fTideSlack';
    }
    factors.push({
      key: 'tide',
      score01,
      weight: p.weights.tide,
      value: v == null ? null : v ? 1 : 0,
      detail: null,
      available: v != null,
      explanationKey,
      explanationParams: {},
      positive: v === true
    });
  }

  // --- Aggregate --------------------------------------------------------
  const totalWeight = factors.reduce((a, f) => a + f.weight, 0) || 1;
  const raw = factors.reduce((a, f) => a + f.weight * f.score01, 0) / totalWeight;
  const completeness =
    factors.reduce((a, f) => a + (f.available ? f.weight : 0), 0) / totalWeight;

  let final = raw;
  // Stale data reduces confidence, does not silently stay "perfect".
  const ageHours = (Date.parse(nowIso) - Date.parse(fetchedAt)) / 3_600_000;
  if (Number.isFinite(ageHours) && ageHours > p.dataQuality.staleAfterHours) {
    final *= p.dataQuality.staleMultiplier;
  }

  const confidenceFactor =
    p.dataQuality.minConfidenceFactor +
    (1 - p.dataQuality.minConfidenceFactor) * completeness;
  const score = Math.round(clamp01(final * confidenceFactor) * 100);

  return { time: s.time, score, completeness, factors };
}

function minutesBetween(a: string, b: string): number {
  const toMin = (t: string) => {
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return 0;
    const days = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Math.floor(days / 86_400_000) * 1440 + Number(m[4]) * 60 + Number(m[5]);
  };
  return toMin(a) - toMin(b);
}

/**
 * Score an hourly series (e.g. a planned session). Deterministic.
 */
export function scoreSeries(
  snapshots: ConditionSnapshot[],
  profile: ScoringProfile,
  sunriseByDate: Record<string, { sunrise: string | null; sunset: string | null }>,
  fetchedAt: string,
  nowIso: string,
  tideMovingByTime: Record<string, boolean | null> = {}
): HourScore[] {
  return snapshots.map((s) => {
    const date = s.time.slice(0, 10);
    const sun = sunriseByDate[date];
    return scoreHour({
      snapshot: s,
      profile,
      sunrise: sun?.sunrise ?? null,
      sunset: sun?.sunset ?? null,
      fetchedAt,
      nowIso,
      tideMoving: tideMovingByTime[s.time] ?? null
    });
  });
}
