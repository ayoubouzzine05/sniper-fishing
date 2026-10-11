/**
 * HTTP client for provider calls.
 *
 * - Timeouts via AbortController
 * - Bounded retries with backoff (network/timeout/5xx only)
 * - In-memory TTL cache + "stale-while-error" fallback: when a live call
 *   fails but we have a cached copy, we return it flagged `fromCache` so the
 *   UI can label it ("cached data, X old") instead of showing nothing.
 * - Never fabricates data: on failure with no cache it throws ProviderError.
 */

export type ProviderErrorKind = 'timeout' | 'http' | 'parse' | 'network' | 'no_data';

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;

  constructor(kind: ProviderErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.status = status;
  }
}

export interface HttpCacheEntry {
  data: unknown;
  fetchedAt: string;
}

interface HttpOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const memoryCache = new Map<string, HttpCacheEntry>();

/** Test hook. */
export function clearHttpCache(): void {
  memoryCache.clear();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new ProviderError('network', 'Aborted'));
    });
  });
}

export async function fetchJson(url: string, opts: HttpOptions = {}): Promise<{ data: unknown; fromCache: boolean; fetchedAt: string }> {
  const {
    timeoutMs = 12_000,
    retries = 2,
    retryDelayMs = 800,
    cacheTtlMs = 10 * 60_000,
    fetchImpl = fetch,
    signal
  } = opts;

  const cached = memoryCache.get(url);
  const now = Date.now();
  if (cached && now - Date.parse(cached.fetchedAt) < cacheTtlMs) {
    return { data: cached.data, fromCache: true, fetchedAt: cached.fetchedAt };
  }

  let lastError: ProviderError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelayMs * attempt, signal);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onOuterAbort = () => controller.abort();
    signal?.addEventListener('abort', onOuterAbort);
    try {
      const res = await fetchImpl(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' }
      });
      if (!res.ok) {
        lastError = new ProviderError('http', `HTTP ${res.status}`, res.status);
        // 5xx is retryable, 4xx is not.
        if (res.status < 500) break;
        continue;
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new ProviderError('parse', 'Response was not valid JSON');
      }
      const fetchedAt = new Date().toISOString();
      memoryCache.set(url, { data: body, fetchedAt });
      return { data: body, fromCache: false, fetchedAt };
    } catch (e) {
      if (e instanceof ProviderError) {
        lastError = e;
        if (e.kind === 'parse') throw e;
      } else if (e instanceof Error && e.name === 'AbortError') {
        lastError = new ProviderError('timeout', 'Request timed out');
      } else {
        lastError = new ProviderError('network', e instanceof Error ? e.message : 'Network error');
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onOuterAbort);
    }
  }

  // Stale-while-error: serve old cache if we have any.
  if (cached) {
    return { data: cached.data, fromCache: true, fetchedAt: cached.fetchedAt };
  }

  throw lastError ?? new ProviderError('no_data', 'No data');
}

export function cacheAgeMinutes(fetchedAt: string, nowIso: string): number {
  return Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(fetchedAt)) / 60_000));
}
