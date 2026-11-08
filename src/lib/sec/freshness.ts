/** Whole days since an ISO timestamp (0 if the timestamp is missing or unreadable). Kept out of components so they stay pure. */
export function daysSince(iso: string | null | undefined, nowMs: number = Date.now()): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.max(0, Math.floor((nowMs - t) / 86_400_000)) : 0;
}
