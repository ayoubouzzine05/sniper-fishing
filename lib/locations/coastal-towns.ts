/**
 * Convenience list of MAJOR MOROCCAN COASTAL TOWNS for first-time users.
 *
 * HONESTY NOTE: these are well-known towns and ports (public places), NOT
 * an endorsement of their fishing quality and NOT curated "hotspots".
 * The UI labels them "coastal towns (quick pick)".
 * Coordinates are approximate (town centers / main ports), ~1 km precision.
 */
import type { ForecastLocation } from '@/lib/models/types';

export interface CoastalTown extends ForecastLocation {
  region: 'atlantic' | 'mediterranean';
}

export const COASTAL_TOWNS: CoastalTown[] = [
  { id: 'town_tanger', name: 'Tanger (Tangier)', latitude: 35.7595, longitude: -5.834, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'mediterranean' },
  { id: 'town_mediouna', name: 'Mediouna', latitude: 35.3525, longitude: -5.9675, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'mediterranean' },
  { id: 'town_nador', name: 'Nador', latitude: 35.174, longitude: -3.1575, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'mediterranean' },
  { id: 'town_alaHoceima', name: 'Al Hoceima', latitude: 35.2203, longitude: -3.8441, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'mediterranean' },
  { id: 'town_asilah', name: 'Asilah', latitude: 35.4612, longitude: -6.0489, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_rabat', name: 'Rabat', latitude: 34.0209, longitude: -6.8416, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_eljaadid', name: 'El Jadida', latitude: 33.2496, longitude: -8.5075, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_casa', name: 'Casablanca', latitude: 33.5731, longitude: -7.5898, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_mohammedia', name: 'Mohammedia', latitude: 33.6592, longitude: -7.4631, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_essaouira', name: 'Essaouira', latitude: 31.5088, longitude: -9.7598, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_agadir', name: 'Agadir', latitude: 30.4278, longitude: -9.5981, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_safi', name: 'Safi', latitude: 32.2994, longitude: -9.2372, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'atlantic' },
  { id: 'town_oujda', name: 'Oujda (Mediterranean coast — via Nador)', latitude: 34.7069, longitude: -1.9086, country: 'Morocco', timezone: 'Africa/Casablanca', region: 'mediterranean' }
];
