export const USERNAME_COOLDOWN_DAYS = 14;
const COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * When the user may next change their username, as an ISO string, or null if
 * they can change it now. Display only: the database trigger is the authority.
 */
export function nextUsernameChange(changedAtIso: string | null | undefined, now: number = Date.now()): string | null {
  if (!changedAtIso) return null;
  const changedAt = new Date(changedAtIso).getTime();
  if (Number.isNaN(changedAt)) return null;
  const allowedAt = changedAt + COOLDOWN_MS;
  return allowedAt > now ? new Date(allowedAt).toISOString() : null;
}
