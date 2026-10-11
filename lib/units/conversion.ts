/**
 * Pure unit-conversion helpers. All inputs/outputs are metric-first;
 * display conversion happens here so the rest of the app stays metric.
 */
import type { DistanceUnit, TempUnit, WindUnit } from '@/lib/models/types';

export const KN_PER_KNOT = 1.852;
export const M_PER_FT = 0.3048;

export function kmhToKnots(kmh: number): number {
  return kmh / KN_PER_KNOT;
}

export function knotsToKmh(knots: number): number {
  return knots * KN_PER_KNOT;
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function mToFt(m: number): number {
  return m / M_PER_FT;
}

export function ftToM(ft: number): number {
  return ft * M_PER_FT;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function convertWind(valueKmh: number, unit: WindUnit): number {
  switch (unit) {
    case 'kmh':
      return valueKmh;
    case 'knots':
      return kmhToKnots(valueKmh);
    case 'ms':
      return kmhToMs(valueKmh);
  }
}

export function convertHeight(m: number, unit: DistanceUnit): number {
  return unit === 'metric' ? m : mToFt(m);
}

export function convertTemperature(celsius: number, unit: TempUnit): number {
  return unit === 'celsius' ? celsius : celsiusToFahrenheit(celsius);
}

/** Round to the precision that is honest for the unit. */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function windDisplay(valueKmh: number | null, unit: WindUnit): number | null {
  if (valueKmh == null) return null;
  const decimals = unit === 'ms' ? 1 : 1;
  return roundTo(convertWind(valueKmh, unit), decimals);
}

export function windUnitLabel(unit: WindUnit): string {
  switch (unit) {
    case 'kmh':
      return 'km/h';
    case 'knots':
      return 'kt';
    case 'ms':
      return 'm/s';
  }
}

export function heightDisplay(m: number | null, unit: DistanceUnit): number | null {
  if (m == null) return null;
  return roundTo(convertHeight(m, unit), unit === 'metric' ? 2 : 1);
}

export function heightUnitLabel(unit: DistanceUnit): string {
  return unit === 'metric' ? 'm' : 'ft';
}

export function tempDisplay(c: number | null, unit: TempUnit): number | null {
  if (c == null) return null;
  return roundTo(convertTemperature(c, unit), 1);
}

export function tempUnitLabel(unit: TempUnit): string {
  return unit === 'celsius' ? '°C' : '°F';
}
