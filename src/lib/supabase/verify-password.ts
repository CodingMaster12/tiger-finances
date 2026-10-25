import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Re-authentication for sensitive actions. Checks a password with a throwaway,
 * non-persisting client so the caller's real session cookies are untouched.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const probe = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}
