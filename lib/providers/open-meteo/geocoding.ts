/**
 * Open-Meteo Geocoding API adapter (place search).
 * Docs: https://open-meteo.com/en/docs/geocoding-api
 * Free, no key required (same usage terms as the other Open-Meteo APIs).
 */
import { z } from 'zod';
import { fetchJson } from '../http';

const geocodeResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  timezone: z.string().optional()
});

const geocodeResponseSchema = z.object({
  results: z.array(geocodeResultSchema).optional()
});

export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

const GEOCODE_HOST = 'https://geocoding-api.open-meteo.com/v1/search';

export function buildGeocodeUrl(name: string, lang: string, count = 6): string {
  const params = new URLSearchParams();
  params.set('name', name);
  params.set('count', String(count));
  params.set('language', lang);
  params.set('format', 'json');
  return `${GEOCODE_HOST}?${params.toString()}`;
}

/** Parse + map a geocoding response. Throws on invalid shape. */
export function parseGeocodeResponse(raw: unknown): GeocodeResult[] {
  const parsed = geocodeResponseSchema.parse(raw);
  return (parsed.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
    timezone: r.timezone
  }));
}

/** Search places by name. Returns [] when there is no match. */
export async function searchPlaces(
  name: string,
  lang: string,
  count = 6
): Promise<GeocodeResult[]> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return [];
  try {
    const { data } = await fetchJson(buildGeocodeUrl(trimmed, lang, count));
    return parseGeocodeResponse(data);
  } catch {
    return [];
  }
}
