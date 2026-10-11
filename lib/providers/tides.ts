/**
 * Tide provider abstraction.
 *
 * By design the app ships WITHOUT an authoritative tide table: a free,
 * globally reliable, properly licensed tide API for Morocco does not exist
 * in the open. Rather than pretending, we expose a provider interface so a
 * licensed source (e.g. a national hydrographic service, or a commercial
 * tide API) can be plugged in later, and every UI surface that mentions
 * tides renders an explicit "no reliable tide data" state.
 *
 * Open-Meteo's `sea_level_height_msl` is a ~8 km model estimate (tides +
 * inversion barometer), NOT a local tide prediction. We display it in the
 * raw data grid with that caveat, but never use it as "tide" for scoring or
 * safety decisions unless a real provider is configured.
 */
import type { ForecastLocation, TidePrediction } from '@/lib/models/types';

export interface TideProvider {
  readonly name: string;
  getTides(location: ForecastLocation): Promise<TidePrediction | null>;
}

/** The default (and only bundled) tide provider: none. Honest by default. */
export class NoTideDataProvider implements TideProvider {
  readonly name = 'none';

  async getTides(_location: ForecastLocation): Promise<TidePrediction | null> {
    return null;
  }
}

export const tideProvider: TideProvider = new NoTideDataProvider();
