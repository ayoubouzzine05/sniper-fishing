/**
 * Best-window detection over an hourly score series.
 *
 * Pure and deterministic. Strategy: sliding fixed-length windows, greedy
 * non-overlap selection (take the best window, remove its hours, repeat).
 * Assumption: 1-hour resolution series (all current providers return hourly).
 */
import type { BestWindow, HourScore } from '@/lib/models/types';

export interface FindWindowsOptions {
  minLengthHours: number;
  maxWindows: number;
  /** Minimum score a window's average needs to be considered at all. */
  minAvgScore?: number;
}

export function findBestWindows(
  hours: HourScore[],
  options: FindWindowsOptions
): BestWindow[] {
  const { minLengthHours, maxWindows, minAvgScore = 0 } = options;
  if (hours.length < minLengthHours) return [];

  const candidates: { startIdx: number; avg: number; peakIdx: number }[] = [];
  for (let start = 0; start + minLengthHours <= hours.length; start++) {
    const slice = hours.slice(start, start + minLengthHours);
    const avg = slice.reduce((a, h) => a + h.score, 0) / slice.length;
    if (avg < minAvgScore) continue;
    let peakIdx = start;
    for (let i = start; i < start + minLengthHours; i++) {
      const h = hours[i];
      if (h && h.score > (hours[peakIdx]?.score ?? -1)) peakIdx = i;
    }
    candidates.push({ startIdx: start, avg, peakIdx });
  }

  candidates.sort((a, b) => b.avg - a.avg || a.startIdx - b.startIdx);

  const chosen: BestWindow[] = [];
  const taken = new Set<number>();
  for (const c of candidates) {
    if (chosen.length >= maxWindows) break;
    const spans = new Set<number>();
    for (let i = c.startIdx; i < c.startIdx + minLengthHours; i++) spans.add(i);
    if ([...spans].some((i) => taken.has(i))) continue;
    spans.forEach((i) => taken.add(i));
    const start = hours[c.startIdx];
    const end = hours[c.startIdx + minLengthHours - 1];
    if (!start || !end) continue;
    chosen.push({ start: start.time, end: end.time, avgScore: Math.round(c.avg), peakIndex: c.peakIdx });
  }

  chosen.sort((a, b) => (a.start < b.start ? -1 : 1));
  return chosen;
}
