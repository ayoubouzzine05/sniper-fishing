/**
 * Deterministic normalization curves used by the scoring engine.
 * Every curve maps a physical value to 0..1. Documented and unit-tested.
 */

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * 1 while value <= goodAt, linear fall-off to 0 at badAt, 0 beyond.
 * Used for "less is better" quantities (wind speed, wave height, rain).
 */
export function rampDown(value: number, goodAt: number, badAt: number): number {
  if (value <= goodAt) return 1;
  if (value >= badAt) return 0;
  if (badAt === goodAt) return 0;
  return 1 - (value - goodAt) / (badAt - goodAt);
}

/**
 * 0 while value <= badAt, linear rise to 1 at goodAt, 1 beyond.
 * Used for "more is better" quantities (visibility, swell period).
 */
export function rampUp(value: number, badAt: number, goodAt: number): number {
  if (value <= badAt) return 0;
  if (value >= goodAt) return 1;
  if (goodAt === badAt) return 1;
  return (value - badAt) / (goodAt - badAt);
}

/**
 * 1 inside [lo, hi], linear fall-off to 0 at outLo / outHi, 0 outside.
 * Used for band preferences (sea temperature).
 */
export function bandScore(
  value: number,
  lo: number,
  hi: number,
  outLo: number,
  outHi: number
): number {
  if (value >= lo && value <= hi) return 1;
  if (value < lo) {
    if (value <= outLo) return 0;
    if (lo === outLo) return 0;
    return (value - outLo) / (lo - outLo);
  }
  if (value >= outHi) return 0;
  if (hi === outHi) return 0;
  return (outHi - value) / (outHi - hi);
}

/**
 * Rain curve: 1 up to lightMax, linear to 0.3 at heavyAt, then 0.1 floor.
 * (Heavy rain is very bad for shore fishing but rarely "zero" — comfort,
 * visibility and safety matter; the safety module handles the hard cut.)
 */
export function rainScore(value: number, lightMax: number, heavyAt: number): number {
  if (value <= lightMax) return 1;
  if (value >= heavyAt) return 0.1;
  if (heavyAt === lightMax) return 0.1;
  return 1 - (0.7 * (value - lightMax)) / (heavyAt - lightMax);
}
