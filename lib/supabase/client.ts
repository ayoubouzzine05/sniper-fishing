/**
 * Optional Supabase client for cloud sync (accounts + sync of spots and
 * sessions). The app is fully functional WITHOUT Supabase configured —
 * this module simply reports "not configured" and the UI hides the
 * account section.
 *
 * Security notes:
 *  - Only the PUBLIC anon key may live in client env vars (NEXT_PUBLIC_).
 *  - The service-role key must NEVER be shipped to the browser; row level
 *    security (supabase/migrations/0001_init.sql) is what makes anon-key
 *    access safe.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return url.startsWith('https://') && anonKey.length > 20;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return client;
}

export async function supabaseSessionEmail(): Promise<string | null> {
  const c = getSupabaseClient();
  if (!c) return null;
  try {
    const { data } = await c.auth.getSession();
    return data.session?.user?.email ?? null;
  } catch {
    return null;
  }
}
