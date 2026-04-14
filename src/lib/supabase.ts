import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Prefer the service key (bypasses RLS — safe server-side only).
// Fall back to anon key with a loud warning so operators know.
let SUPABASE_KEY = SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY && SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_KEY not set — falling back to SUPABASE_ANON_KEY. ' +
    'Row-level security policies will apply. Set SUPABASE_SERVICE_KEY in .env.local for full access.'
  );
  SUPABASE_KEY = SUPABASE_ANON_KEY;
}

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL.startsWith('http') && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[supabase] Missing SUPABASE_URL or key — database calls will fail.');
}

function requireDb(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  }
  return supabase;
}

// Only export requireDb — callers should never need the raw nullable client
export { requireDb };
export type { SupabaseClient };
