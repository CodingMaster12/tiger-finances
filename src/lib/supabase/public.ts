import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Read-only client for public data (no cookies, no user session). Row-level security lets it read the SEC
 * data tables and nothing else. Returns null when Supabase is not configured so callers can fall back.
 */
export function createPublicClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
