import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/** Per-request client bound to the caller's session cookies. All queries run under their RLS identity. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies. The proxy refreshes sessions.
        }
      },
    },
  });
}
