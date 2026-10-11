/**
 * Unit-conversion tests (wind, height, temperature, display rounding).
 */
import { describe, it, expect } from 'vitest';
import {
  kmhToKnots,
  knotsToKmh,
  kmhToMs,
  msToKmh,
  mToFt,
  ftToM,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  convertWind,
  convertHeight,
  convertTemperature,
  windDisplay,
  heightDisplay,
  tempDisplay,
  KN_PER_KNOT,
  M_PER_FT
} from '@/lib/units/conversion';

describe('unit conversion', () => {
  it('converts km/h to knots and back', () => {
    expect(kmhToKnots(18.52)).toBeCloseTo(10, 5);
    expect(knotsToKmh(10)).toBeCloseTo(18.52, 5);
    expect(knotsToKmh(kmhToKnots(42))).toBeCloseTo(42, 8);
  });

  it('knows the knot constant', () => {
    expect(KN_PER_KNOT).toBeCloseTo(1.852, 6);
    expect(M_PER_FT).toBeCloseTo(0.3048, 6);
  });

  it('converts km/h to m/s and back', () => {
    expect(kmhToMs(3.6)).toBeCloseTo(1, 6);
    expect(msToKmh(10)).toBeCloseTo(36, 6);
    expect(msToKmh(kmhToMs(25))).toBeCloseTo(25, 8);
  });

  it('converts metres to feet and back', () => {
    expect(mToFt(3.048)).toBeCloseTo(10, 5);
    expect(ftToM(10)).toBeCloseTo(3.048, 5);
    expect(ftToM(mToFt(1.7))).toBeCloseTo(1.7, 8);
  });

  it('converts celsius to fahrenheit and back', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(celsiusToFahrenheit(21.5))).toBeCloseTo(21.5, 8);
  });

  it('convertWind handles all wind units', () => {
    expect(convertWind(18.52, 'kmh')).toBe(18.52);
    expect(convertWind(18.52, 'knots')).toBeCloseTo(10, 5);
    expect(convertWind(36, 'ms')).toBeCloseTo(10, 6);
  });

  it('convertHeight switches metric/imperial', () => {
    expect(convertHeight(1, 'metric')).toBe(1);
    expect(convertHeight(3.048, 'imperial')).toBeCloseTo(10, 5);
  });

  it('convertTemperature switches celsius/fahrenheit', () => {
    expect(convertTemperature(20, 'celsius')).toBe(20);
    expect(convertTemperature(20, 'fahrenheit')).toBe(68);
  });

  it('windDisplay returns null for missing values and rounds to 1 decimal', () => {
    expect(windDisplay(null, 'kmh')).toBeNull();
    expect(windDisplay(7.64, 'kmh')).toBe(7.6);
    expect(windDisplay(7.64, 'knots')).toBeCloseTo(4.1, 1);
    expect(windDisplay(14.4, 'ms')).toBe(4);
  });

  it('heightDisplay rounds metric to 2 decimals, imperial to 1', () => {
    expect(heightDisplay(0.5249, 'metric')).toBe(0.52);
    expect(heightDisplay(1, 'imperial')).toBe(3.3);
  });

  it('tempDisplay handles null and rounding', () => {
    expect(tempDisplay(null, 'celsius')).toBeNull();
    expect(tempDisplay(19.64, 'celsius')).toBe(19.6);
    expect(tempDisplay(19.6, 'fahrenheit')).toBe(67.3);
  });
});
