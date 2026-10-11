/**
 * Reverse geocoding for the map point-picker.
 *
 * Uses BigDataCloud's free client-side reverse geocoding API (no key, no
 * account — see https://www.bigdatacloud.net/data/reverse-geocode-client).
 * Fails gracefully: if it is unavailable the UI simply shows coordinates,
 * which is never fabricated.
 */
import { z } from 'zod';
import { fetchJson } from '../http';

const reverseSchema = z
  .object({
    city: z.string().optional(),
    locality: z.string().optional(),
    principalSubdivision: z.string().optional(),
    countryName: z.string().optional(),
    countryCode: z.string().optional()
  })
  .passthrough();

export interface ReverseGeocode {
  name: string;
  country?: string;
  admin1?: string;
}

/**
 * Reverse-geocode coordinates into a human-readable label.
 * Returns null when the service is unavailable or has no label — callers
 * must fall back to "lat, lon" display, never to an invented name.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string
): Promise<ReverseGeocode | null> {
  const params = new URLSearchParams();
  params.set('latitude', String(latitude));
  params.set('longitude', String(longitude));
  params.set('localityLanguage', language);
  try {
    const { data } = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`,
      { retries: 0, timeoutMs: 6000, cacheTtlMs: 24 * 3600_000 }
    );
    const parsed = reverseSchema.parse(data);
    const city = parsed.city || parsed.locality;
    if (!city) return null;
    return {
      name: city,
      country: parsed.countryName,
      admin1: parsed.principalSubdivision
    };
  } catch {
    return null;
  }
}
