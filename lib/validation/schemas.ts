/**
 * Zod schemas for user-provided data (spots, sessions, settings, plans).
 * Used at the persistence boundary and for import validation.
 * Note: photo data URLs are excluded from strict validation of size here —
 * the upload UI enforces the 500 KB cap.
 */
import { z } from 'zod';

const FISHING_METHOD_VALUES = [
  'surfcasting',
  'shore_spinning',
  'harbor',
  'rock',
  'float',
  'boat',
  'kayak'
] as const;

export const FishingMethodSchema = z.enum(FISHING_METHOD_VALUES);

export const LocationTypeSchema = z.enum([
  'shore',
  'harbor',
  'port',
  'beach',
  'rock',
  'jetty',
  'estuary',
  'open_water',
  'other'
]);

export const ForecastLocationSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().max(120).optional(),
  admin1: z.string().max(160).optional(),
  timezone: z.string().max(64).optional()
});

export const SpotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationType: LocationTypeSchema,
  methods: z.array(FishingMethodSchema).max(7).default([]),
  targetSpecies: z.array(z.string().max(80)).max(30).default([]),
  accessNotes: z.string().max(2000).default(''),
  privateNotes: z.string().max(4000).default(''),
  isFavorite: z.boolean().default(false),
  photos: z.array(z.string().max(800_000)).max(6).default([]),
  createdAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().min(1))
});

export const CatchEntrySchema = z.object({
  id: z.string().min(1),
  species: z.string().min(1).max(120),
  weightGrams: z.number().min(0).max(2_000_000).nullable().default(null),
  lengthCm: z.number().min(0).max(2000).nullable().default(null),
  kept: z.boolean().default(true),
  note: z.string().max(500).default(''),
  photoDataUrl: z
    .string()
    .max(800_000)
    .nullable()
    .default(null)
});

export const SessionConditionsSchema = z.object({
  windSpeed: z.number().nullable(),
  windGusts: z.number().nullable(),
  waveHeight: z.number().nullable(),
  precipitation: z.number().nullable(),
  temperature: z.number().nullable(),
  weatherCode: z.number().nullable(),
  capturedAt: z.string().min(1),
  source: z.string().max(160)
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: ForecastLocationSchema,
  spotId: z.string().nullable().default(null),
  method: FishingMethodSchema,
  targetSpecies: z.array(z.string().max(80)).max(30).default([]),
  baitOrLure: z.string().max(160).default(''),
  equipmentNotes: z.string().max(1000).default(''),
  notes: z.string().max(4000).default(''),
  conditions: SessionConditionsSchema.nullable().default(null),
  catches: z.array(CatchEntrySchema).max(500).default([]),
  photos: z.array(z.string().max(800_000)).max(6).default([]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export const TripPlanSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  location: ForecastLocationSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  method: FishingMethodSchema,
  targetSpecies: z.string().max(160).default('')
});

export const SettingsSchema = z.object({
  language: z.enum(['ary', 'ar', 'fr', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
  windUnit: z.enum(['kmh', 'knots', 'ms']),
  distanceUnit: z.enum(['metric', 'imperial']),
  tempUnit: z.enum(['celsius', 'fahrenheit']),
  defaultMethod: FishingMethodSchema,
  defaultLocation: ForecastLocationSchema.nullable().default(null),
  onboardingDone: z.boolean().default(false)
});

/** Full-app backup envelope for export/import. */
export const BackupSchema = z.object({
  app: z.literal('sniper-fishing'),
  // Unknown future versions are REJECTED on import (safe: never silently
  // misinterpret a format we do not understand).
  version: z.literal(1),
  exportedAt: z.string(),
  settings: SettingsSchema.nullable(),
  spots: z.array(SpotSchema),
  sessions: z.array(SessionSchema),
  plans: z.array(TripPlanSchema)
});
