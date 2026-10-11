/**
 * Marine/weather warning provider abstraction.
 *
 * There is no free, keyless, globally authoritative marine warning API that
 * covers Morocco that we can verify and license today. The app therefore:
 *   1. keeps a provider interface so an official source (e.g. DPM /
 *      Direction de la Pêche Maritime, Météo Maroc, or a commercial feed)
 *      can be wired in later,
 *   2. always distinguishes OFFICIAL warnings (official: true) from
 *      app-generated threshold alerts (official: false) in the UI, and
 *   3. never claims to have official warnings when it does not.
 */
import type { ForecastLocation, MarineWarning } from '@/lib/models/types';

export interface WarningProvider {
  readonly name: string;
  getWarnings(location: ForecastLocation): Promise<MarineWarning[]>;
}

export class NoOfficialWarningProvider implements WarningProvider {
  readonly name = 'none';

  async getWarnings(_location: ForecastLocation): Promise<MarineWarning[]> {
    return [];
  }
}

export const warningProvider: WarningProvider = new NoOfficialWarningProvider();
