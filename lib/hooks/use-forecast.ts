'use client';

/**
 * Client hook: fetch merged forecast for a location with loading/error
 * states, retry support and explicit per-provider error kinds.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ForecastLocation, MergedForecast } from '@/lib/models/types';
import { fetchMergedForecast, providerErrorMessage } from '@/lib/providers';
import { errorI18nKey } from '@/lib/providers';

export interface ForecastState {
  data: MergedForecast | null;
  loading: boolean;
  /** i18n key under errors.* when a full failure; partial errors live in data */
  error: string | null;
  stale: { marine: boolean; weather: boolean };
}

export function useForecast(
  location: ForecastLocation | null,
  days = 3
): ForecastState & { retry: () => void } {
  const [state, setState] = useState<ForecastState>({
    data: null,
    loading: false,
    error: null,
    stale: { marine: false, weather: false }
  });
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!location) {
      setState({ data: null, loading: false, error: null, stale: { marine: false, weather: false } });
      return;
    }
    let cancelled = false;
    if (inFlight.current) return;
    inFlight.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchMergedForecast(location, { days })
      .then((merged) => {
        if (cancelled) return;
        const fullFailure = merged.hours.length === 0;
        setState({
          data: fullFailure ? null : merged,
          loading: false,
          error: fullFailure
            ? errorI18nKey(
                merged.marineError ?? merged.weatherError ?? 'api'
              )
            : null,
          stale: {
            marine: merged.marineError != null && merged.marine == null,
            weather: merged.weatherError != null && merged.weather == null
          }
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error: errorI18nKey(providerErrorMessage(e)),
          stale: { marine: false, weather: false }
        });
      })
      .finally(() => {
        inFlight.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [location, days, attempt]);

  return { ...state, retry };
}
