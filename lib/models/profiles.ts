/**
 * Scoring profiles per fishing method, plus regional presets.
 *
 * IMPORTANT: these are INITIAL, CONFIGURABLE HEURISTICS built from common
 * angling knowledge (e.g. surfcasting tolerates more wind than kayak
 * fishing; dawn/dusk are often good light windows). They are NOT local
 * scientific models and NOT validated. Every threshold and weight below can
 * be changed in code (or via settings in a future release) — see
 * docs/SCORING.md for the contract.
 */
import type { FishingMethod, ScoringProfile } from './types';

export type RegionPreset = 'generic' | 'morocco_atlantic' | 'morocco_mediterranean';

const BASE: Record<FishingMethod, Omit<ScoringProfile, 'id' | 'label'>> = {
  surfcasting: {
    method: 'surfcasting',
    windSpeed: { idealMax: 18, poorAbove: 45 },
    gusts: { penalizeAbove: 50 },
    wave: { idealMax: 1.2, poorAbove: 2.5 },
    swell: { idealMax: 1.0, poorAbove: 2.2, periodGoodAt: 8 },
    rain: { lightMax: 1, heavyAt: 6 },
    visibility: { idealMin: 5, poorBelow: 1 },
    daylight: { dawnMinutes: 60, duskMinutes: 60, nightScore: 0.35 },
    seaTemp: { band: null },
    tide: { enabled: false },
    weights: { wind: 22, gusts: 10, wave: 18, swell: 12, rain: 12, visibility: 8, daylight: 12, seaTemp: 0, tide: 6 },
    dataQuality: { missingFactorScore: 0.35, staleAfterHours: 24, staleMultiplier: 0.9, minConfidenceFactor: 0.7 }
  },
  shore_spinning: {
    method: 'shore_spinning',
    windSpeed: { idealMax: 15, poorAbove: 35 },
    gusts: { penalizeAbove: 40 },
    wave: { idealMax: 0.8, poorAbove: 1.8 },
    swell: { idealMax: 0.7, poorAbove: 1.5, periodGoodAt: 7 },
    rain: { lightMax: 1, heavyAt: 5 },
    visibility: { idealMin: 5, poorBelow: 1 },
    daylight: { dawnMinutes: 45, duskMinutes: 45, nightScore: 0.3 },
    seaTemp: { band: null },
    tide: { enabled: false },
    weights: { wind: 24, gusts: 10, wave: 16, swell: 10, rain: 12, visibility: 8, daylight: 14, seaTemp: 0, tide: 6 },
    dataQuality: { missingFactorScore: 0.35, staleAfterHours: 24, staleMultiplier: 0.9, minConfidenceFactor: 0.7 }
  },
  harbor: {
    method: 'harbor',
    windSpeed: { idealMax: 20, poorAbove: 45 },
    gusts: { penalizeAbove: 55 },
    wave: { idealMax: 0.8, poorAbove: 1.5 },
    swell: { idealMax: 0.7, poorAbove: 1.3, periodGoodAt: 6 },
    rain: { lightMax: 2, heavyAt: 8 },
    visibility: { idealMin: 4, poorBelow: 0.8 },
    daylight: { dawnMinutes: 45, duskMinutes: 45, nightScore: 0.4 },
    seaTemp: { band: null },
    tide: { enabled: false },
    weights: { wind: 18, gusts: 8, wave: 14, swell: 8, rain: 14, visibility: 8, daylight: 16, seaTemp: 0, tide: 14 },
    dataQuality: { missingFactorScore: 0.35, staleAfterHours: 24, staleMultiplier: 0.9, minConfidenceFactor: 0.7 }
  },
  rock: {
    method: 'rock',
    windSpeed: { idealMax: 15, poorAbove: 35 },
    gusts: { penalizeAbove: 40 },
    wave: { idealMax: 1.0, poorAbove: 2.0 },
    swell: { idealMax: 0.9, poorAbove: 1.6, periodGoodAt: 8 },
    rain: { lightMax: 1, heavyAt: 5 },
    visibility: { idealMin: 4, poorBelow: 1 },
    daylight: { dawnMinutes: 45, duskMinutes: 60, nightScore: 0.25 },
    seaTemp: { band: null },
    tide: { enabled: true },
    weights: { wind: 22, gusts: 10, wave: 18, swell: 12, rain: 10, visibility: 8, daylight: 10, seaTemp: 0, tide: 10 },
    dataQuality: { missingFactorScore: 0.3, staleAfterHours: 24, staleMultiplier: 0.85, minConfidenceFactor: 0.7 }
  },
  float: {
    method: 'float',
    windSpeed: { idealMax: 12, poorAbove: 30 },
    gusts: { penalizeAbove: 35 },
    wave: { idealMax: 0.5, poorAbove: 1.2 },
    swell: { idealMax: 0.5, poorAbove: 1.0, periodGoodAt: 6 },
    rain: { lightMax: 1, heavyAt: 5 },
    visibility: { idealMin: 5, poorBelow: 1 },
    daylight: { dawnMinutes: 60, duskMinutes: 60, nightScore: 0.3 },
    seaTemp: { band: null },
    tide: { enabled: true },
    weights: { wind: 22, gusts: 10, wave: 14, swell: 8, rain: 12, visibility: 8, daylight: 16, seaTemp: 6, tide: 4 },
    dataQuality: { missingFactorScore: 0.35, staleAfterHours: 24, staleMultiplier: 0.9, minConfidenceFactor: 0.7 }
  },
  boat: {
    method: 'boat',
    windSpeed: { idealMax: 18, poorAbove: 35 },
    gusts: { penalizeAbove: 45 },
    wave: { idealMax: 1.0, poorAbove: 2.0 },
    swell: { idealMax: 1.0, poorAbove: 1.8, periodGoodAt: 9 },
    rain: { lightMax: 1, heavyAt: 6 },
    visibility: { idealMin: 6, poorBelow: 2 },
    daylight: { dawnMinutes: 45, duskMinutes: 45, nightScore: 0.3 },
    seaTemp: { band: null },
    tide: { enabled: false },
    weights: { wind: 22, gusts: 12, wave: 16, swell: 12, rain: 10, visibility: 10, daylight: 10, seaTemp: 0, tide: 8 },
    dataQuality: { missingFactorScore: 0.3, staleAfterHours: 24, staleMultiplier: 0.85, minConfidenceFactor: 0.7 }
  },
  kayak: {
    method: 'kayak',
    windSpeed: { idealMax: 12, poorAbove: 28 },
    gusts: { penalizeAbove: 30 },
    wave: { idealMax: 0.5, poorAbove: 1.2 },
    swell: { idealMax: 0.5, poorAbove: 1.0, periodGoodAt: 7 },
    rain: { lightMax: 1, heavyAt: 5 },
    visibility: { idealMin: 6, poorBelow: 2 },
    daylight: { dawnMinutes: 45, duskMinutes: 45, nightScore: 0.2 },
    seaTemp: { band: null },
    tide: { enabled: false },
    weights: { wind: 26, gusts: 12, wave: 16, swell: 10, rain: 8, visibility: 10, daylight: 10, seaTemp: 0, tide: 8 },
    dataQuality: { missingFactorScore: 0.3, staleAfterHours: 24, staleMultiplier: 0.85, minConfidenceFactor: 0.7 }
  }
};

/**
 * Build a scoring profile for a method and an optional regional preset.
 *
 * - 'morocco_atlantic': slightly more tolerant swell threshold (the Atlantic
 *   coast regularly sees longer-period swell) — initial heuristic.
 * - 'morocco_mediterranean': calmer baseline expectations.
 */
export function buildProfile(
  method: FishingMethod,
  preset: RegionPreset = 'generic'
): ScoringProfile {
  const base = BASE[method];
  let swell = { ...base.swell };
  let windSpeed = { ...base.windSpeed };
  let label: string;

  switch (preset) {
    case 'morocco_atlantic':
      swell = { ...swell, idealMax: swell.idealMax + 0.3, poorAbove: swell.poorAbove + 0.6, periodGoodAt: (swell.periodGoodAt ?? 7) + 1 };
      windSpeed = { ...windSpeed, idealMax: windSpeed.idealMax + 3, poorAbove: windSpeed.poorAbove + 5 };
      label = `${method} · Morocco Atlantic (initial heuristic)`;
      break;
    case 'morocco_mediterranean':
      swell = { ...swell, idealMax: Math.max(0.3, swell.idealMax - 0.2), poorAbove: Math.max(0.6, swell.poorAbove - 0.4) };
      label = `${method} · Morocco Mediterranean (initial heuristic)`;
      break;
    default:
      label = `${method} · generic (initial heuristic)`;
  }

  return {
    ...base,
    id: `${preset}:${method}`,
    label,
    windSpeed,
    swell
  };
}
