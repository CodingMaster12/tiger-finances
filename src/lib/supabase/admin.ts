import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Privileged client that bypasses RLS. Server-only (the import above fails the
 * build if this is ever bundled for the browser). Use only for operations that
 * cannot be done as the user, such as deleting an auth account.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secret) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
