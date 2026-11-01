/**
 * Supabase can reject a password the app's own rules accept, using
 * server-side settings (minimum length, required character types, and
 * leaked-password checks). It reports why; show that instead of a vague message.
 */
export function weakPasswordMessage(error: unknown): string {
  const reasons: string[] =
    typeof error === "object" && error !== null && "reasons" in error && Array.isArray((error as { reasons: unknown }).reasons)
      ? ((error as { reasons: string[] }).reasons)
      : [];
  const parts: string[] = [];
  if (reasons.includes("pwned")) parts.push("it appears in a known data breach, so choose a different one");
  if (reasons.includes("length")) parts.push("the server requires a longer password");
  if (reasons.includes("characters")) parts.push("the server requires additional character types (such as uppercase, lowercase, a number or a symbol)");
  if (parts.length === 0) return "The server rejected that password. Try a longer, less common one.";
  return `The server rejected that password: ${parts.join("; ")}.`;
}
