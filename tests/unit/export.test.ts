/**
 * Export/import tests against the REAL export helpers used by the app pages
 * (csvEscape, toCsv, parseCsvLine) with the exact column sets from
 * app/[locale]/spots/page.tsx and app/[locale]/logbook/page.tsx.
 */
import { describe, it, expect } from 'vitest';
import { csvEscape, toCsv, parseCsvLine } from '@/lib/persistence/export';
import { SpotSchema, SessionSchema } from '@/lib/validation/schemas';
import type { FishingSession, Spot } from '@/lib/models/types';

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: 's1',
    name: 'Tangier "Beach", East',
    description: 'Line one\nline two',
    latitude: 35.7595,
    longitude: -5.834,
    locationType: 'shore',
    methods: ['surfcasting'],
    targetSpecies: ['sea bream'],
    accessNotes: 'foot access',
    privateNotes: 'private',
    isFavorite: true,
    createdAt: '2026-10-11T08:00:00.000Z',
    updatedAt: '2026-10-11T08:00:00.000Z',
    photos: [],
    ...overrides
  };
}

function makeSession(overrides: Partial<FishingSession> = {}): FishingSession {
  return {
    id: 'sess1',
    date: '2026-10-11',
    startTime: '07:00',
    endTime: '09:30',
    location: { id: 'geo_t', name: 'Tangier', latitude: 35.7595, longitude: -5.834 },
    spotId: null,
    method: 'surfcasting',
    targetSpecies: ['sea bream'],
    baitOrLure: 'dead shad',
    equipmentNotes: '4.2m rod',
    notes: 'Wind from NE, water clear',
    conditions: {
      windSpeed: 10,
      windGusts: 15,
      waveHeight: 0.5,
      precipitation: 0,
      temperature: 20,
      weatherCode: 2,
      capturedAt: '2026-10-11T07:00:00.000Z',
      source: 'Open-Meteo'
    },
    catches: [
      { id: 'c1', species: 'sea bream', weightGrams: 800, lengthCm: 38, kept: true, note: 'bait: shad', photoDataUrl: null },
      { id: 'c2', species: 'sea bass', weightGrams: 1200, lengthCm: 42, kept: true, note: '', photoDataUrl: null }
    ],
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    photos: [],
    ...overrides
  };
}

// Same column definitions as app/[locale]/spots/page.tsx (exportCsv).
const SPOT_COLUMNS = [
  { header: 'name', value: (s: Spot) => s.name },
  { header: 'lat', value: (s: Spot) => s.latitude },
  { header: 'lon', value: (s: Spot) => s.longitude },
  { header: 'type', value: (s: Spot) => s.locationType },
  { header: 'methods', value: (s: Spot) => s.methods.join('|') },
  { header: 'species', value: (s: Spot) => s.targetSpecies.join('|') },
  { header: 'favorite', value: (s: Spot) => (s.isFavorite ? 1 : 0) }
];

// Same column definitions as app/[locale]/logbook/page.tsx (exportCsv).
const SESSION_COLUMNS = [
  { header: 'date', value: (s: FishingSession) => s.date },
  { header: 'start', value: (s: FishingSession) => s.startTime },
  { header: 'end', value: (s: FishingSession) => s.endTime },
  { header: 'location', value: (s: FishingSession) => s.location.name },
  { header: 'method', value: (s: FishingSession) => s.method },
  { header: 'species_target', value: (s: FishingSession) => s.targetSpecies.join('|') },
  { header: 'bait_or_lure', value: (s: FishingSession) => s.baitOrLure },
  { header: 'catch_count', value: (s: FishingSession) => s.catches.length },
  { header: 'catches', value: (s: FishingSession) => s.catches.map((c) => `${c.species}:${c.weightGrams ?? ''}g`).join('|') },
  { header: 'wind_kmh', value: (s: FishingSession) => s.conditions?.windSpeed ?? '' },
  { header: 'wave_m', value: (s: FishingSession) => s.conditions?.waveHeight ?? '' },
  { header: 'notes', value: (s: FishingSession) => s.notes }
];

describe('CSV primitives', () => {
  it('escapes quotes, commas and newlines (RFC 4180-ish)', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape(12.5)).toBe('12.5');
  });

  it('parseCsvLine inverts csvEscape (round trip)', () => {
    const values = ['plain', 'a,b', 'say "hi"', '', '12.5', 'x,y,"z"'];
    const line = values.map(csvEscape).join(',');
    expect(parseCsvLine(line)).toEqual(values);
  });

  it('toCsv builds header + rows with deterministic column order', () => {
    const csv = toCsv([{ a: 1, b: 'x,y' }, { a: 2, b: 'q' }], [
      { header: 'a', value: (r: { a: number; b: string }) => r.a },
      { header: 'b', value: (r: { a: number; b: string }) => r.b }
    ]);
    expect(csv).toBe('a,b\n1,"x,y"\n2,q');
  });
});

describe('spots CSV (page column set)', () => {
  it('round-trips a spot with quotes/commas/newlines in the name', () => {
    const csv = toCsv([makeSpot(), makeSpot({ id: 's2', name: 'Harbor', isFavorite: false, methods: ['harbor', 'rock'] })], SPOT_COLUMNS);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,lat,lon,type,methods,species,favorite');
    expect(lines.length).toBe(3);
    const row = parseCsvLine(lines[1]!);
    expect(row[0]).toBe('Tangier "Beach", East');
    expect(row[1]).toBe('35.7595');
    expect(row[4]).toBe('surfcasting');
    expect(row[6]).toBe('1');
    const row2 = parseCsvLine(lines[2]!);
    expect(row2[4]).toBe('harbor|rock');
    expect(row2[6]).toBe('0');
  });
});

describe('sessions CSV (page column set)', () => {
  it('serializes catches compactly and includes the conditions snapshot', () => {
    const csv = toCsv([makeSession()], SESSION_COLUMNS);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,start,end,location,method,species_target,bait_or_lure,catch_count,catches,wind_kmh,wave_m,notes');
    const row = parseCsvLine(lines[1]!);
    expect(row[0]).toBe('2026-10-11');
    expect(row[4]).toBe('surfcasting');
    expect(row[7]).toBe('2');
    expect(row[8]).toBe('sea bream:800g|sea bass:1200g');
    expect(row[9]).toBe('10');
    expect(row[10]).toBe('0.5');
    expect(row[11]).toBe('Wind from NE, water clear');
  });

  it('zero-catch session exports with catch_count 0 and empty catches', () => {
    const csv = toCsv([makeSession({ id: 'z1', catches: [], conditions: null })], SESSION_COLUMNS);
    const row = parseCsvLine(csv.split('\n')[1]!);
    expect(row[7]).toBe('0');
    expect(row[8]).toBe('');
    expect(row[9]).toBe('');
    expect(row[10]).toBe('');
  });
});

describe('JSON export validation round trip', () => {
  it('spots serialize and re-parse through SpotSchema', () => {
    const spots = [makeSpot(), makeSpot({ id: 's2' })];
    const json = JSON.stringify({ spots }, null, 2);
    const back = JSON.parse(json) as { spots: unknown[] };
    for (const s of back.spots) {
      expect(SpotSchema.safeParse(s).success).toBe(true);
    }
  });

  it('sessions serialize and re-parse through SessionSchema', () => {
    const sessions = [makeSession()];
    const json = JSON.stringify({ sessions }, null, 2);
    const back = JSON.parse(json) as { sessions: unknown[] };
    expect(SessionSchema.safeParse(back.sessions[0]).success).toBe(true);
  });
});
