/**
 * Wind direction / daylight math tests.
 */
import { describe, it, expect } from 'vitest';
import {
  compassFromDegrees,
  bearingDiff,
  relativeToShoreline,
  isDaylightAt,
  daylightDurationHours
} from '@/lib/geo/wind';

describe('wind direction', () => {
  it('maps bearings to the 8 compass points', () => {
    expect(compassFromDegrees(0)).toBe('n');
    expect(compassFromDegrees(10)).toBe('n');
    expect(compassFromDegrees(45)).toBe('ne');
    expect(compassFromDegrees(90)).toBe('e');
    expect(compassFromDegrees(135)).toBe('se');
    expect(compassFromDegrees(180)).toBe('s');
    expect(compassFromDegrees(225)).toBe('sw');
    expect(compassFromDegrees(270)).toBe('w');
    expect(compassFromDegrees(315)).toBe('nw');
    expect(compassFromDegrees(359)).toBe('n');
  });

  it('wraps bearings and rejects null', () => {
    expect(compassFromDegrees(370)).toBe('n');
    expect(compassFromDegrees(-10)).toBe('n');
    expect(compassFromDegrees(null)).toBeNull();
    expect(compassFromDegrees(Number.NaN)).toBeNull();
  });

  it('bearing difference is the smallest angle in [0,180]', () => {
    expect(bearingDiff(0, 30)).toBe(30);
    expect(bearingDiff(350, 10)).toBe(20);
    expect(bearingDiff(90, 270)).toBe(180);
    expect(bearingDiff(40, 40)).toBe(0);
  });

  it('classifies wind relative to shoreline facing', () => {
    // Shore faces 90° (E). Wind FROM 90° = offshore; FROM 270° = onshore.
    expect(relativeToShoreline(90, 90)).toBe('offshore');
    expect(relativeToShoreline(110, 90)).toBe('offshore');
    expect(relativeToShoreline(270, 90)).toBe('onshore');
    expect(relativeToShoreline(250, 90)).toBe('onshore');
    expect(relativeToShoreline(0, 90)).toBe('alongshore');
    expect(relativeToShoreline(null, 90)).toBeNull();
    expect(relativeToShoreline(90, null)).toBeNull();
  });
});

describe('daylight', () => {
  it('isDaylightAt compares wall-clock times', () => {
    expect(isDaylightAt('2026-10-11T08:00', '2026-10-11T07:26', '2026-10-11T18:32')).toBe(true);
    expect(isDaylightAt('2026-10-11T06:00', '2026-10-11T07:26', '2026-10-11T18:32')).toBe(false);
    expect(isDaylightAt('2026-10-11T23:00', '2026-10-11T07:26', '2026-10-11T18:32')).toBe(false);
    expect(isDaylightAt('2026-10-11T12:00', null, '2026-10-11T18:32')).toBeNull();
  });

  it('computes daylight duration', () => {
    expect(daylightDurationHours('2026-10-11T07:26', '2026-10-11T18:32')).toBeCloseTo(11.1, 1);
    expect(daylightDurationHours(null, '2026-10-11T18:32')).toBeNull();
  });
});
