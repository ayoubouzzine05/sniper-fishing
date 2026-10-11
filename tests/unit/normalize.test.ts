/**
 * Normalization curve tests.
 */
import { describe, it, expect } from 'vitest';
import { clamp01, rampDown, rampUp, bandScore, rainScore } from '@/lib/scoring/normalize';

describe('normalize', () => {
  it('clamp01 clamps to [0,1]', () => {
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(3)).toBe(1);
  });

  it('rampDown is 1 below goodAt, 0 at/above badAt, linear between', () => {
    expect(rampDown(5, 10, 20)).toBe(1);
    expect(rampDown(10, 10, 20)).toBe(1);
    expect(rampDown(15, 10, 20)).toBe(0.5);
    expect(rampDown(20, 10, 20)).toBe(0);
    expect(rampDown(99, 10, 20)).toBe(0);
  });

  it('rampUp is 0 at/below badAt, 1 at/above goodAt, linear between', () => {
    expect(rampUp(0.5, 1, 5)).toBe(0);
    expect(rampUp(1, 1, 5)).toBe(0);
    expect(rampUp(3, 1, 5)).toBe(0.5);
    expect(rampUp(5, 1, 5)).toBe(1);
    expect(rampUp(99, 1, 5)).toBe(1);
  });

  it('bandScore is 1 inside the band and 0 far outside', () => {
    expect(bandScore(15, 14, 18, 10, 22)).toBe(1);
    expect(bandScore(14, 14, 18, 10, 22)).toBe(1);
    expect(bandScore(10, 14, 18, 10, 22)).toBe(0);
    expect(bandScore(22, 14, 18, 10, 22)).toBe(0);
    expect(bandScore(12, 14, 18, 10, 22)).toBe(0.5);
    expect(bandScore(20, 14, 18, 10, 22)).toBe(0.5);
  });

  it('rainScore: 1 below lightMax, 0.1 floor at heavyAt', () => {
    expect(rainScore(0, 1, 6)).toBe(1);
    expect(rainScore(1, 1, 6)).toBe(1);
    expect(rainScore(6, 1, 6)).toBe(0.1);
    expect(rainScore(8, 1, 6)).toBe(0.1);
    expect(rainScore(3.5, 1, 6)).toBeCloseTo(1 - 0.7 * (2.5 / 5), 6);
  });
});
