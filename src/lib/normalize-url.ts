/**
 * Turns a configured site address into an absolute origin without a trailing
 * slash. Tolerates a missing scheme ("example.vercel.app") because a relative
 * redirect URL makes Supabase build a broken email link.
 */
export function normalizeSiteUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${/^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed) ? "http" : "https"}://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}
