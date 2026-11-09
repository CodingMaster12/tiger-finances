import { SecError } from "./types";

/**
 * Polite SEC fetcher. No `server-only` guard here so the data-sync job can reuse it; the website imports it through `client.ts`, which adds the guard.
 * SEC rules (read from sec.gov): at most 10 requests/second in total, a declared User-Agent
 * with contact details, and "download only what you need". We stay far under the limit and retry gently.
 */
export const SEC_DATA_ORIGIN = "https://data.sec.gov";

/**
 * Where to fetch SEC data. Development and tests may point this at a local fixture server with
 * SEC_DATA_ORIGIN=http://localhost:PORT. It is ignored in production, so a stray variable can never
 * redirect the live site.
 */
export function resolveDataOrigin(env: Record<string, string | undefined> = process.env): string {
  const override = env.SEC_DATA_ORIGIN?.trim();
  if (override && env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(override)) return override;
  return SEC_DATA_ORIGIN;
}

const DEV_USER_AGENT = "TigerFinances-dev/0.1 (local development; set SEC_USER_AGENT)";

/**
 * The SEC's required format is a name plus an email address, e.g. "Tiger Finances you@example.com".
 * Verified 2026-11-09 from four networks (Vercel, GitHub, the cloud session, the owner's Mac): the same request is
 * refused ("Undeclared Automated Tool", HTTP 403) when the line contains a web link and accepted when it does not.
 */
export function isAcceptableUserAgent(ua: string | null | undefined): boolean {
  return typeof ua === "string" && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(ua) && !/https?:\/\//i.test(ua);
}

/** SEC_USER_AGENT must name the app and an email contact, with no web link. */
export function resolveUserAgent(env: Record<string, string | undefined> = process.env): string {
  const ua = env.SEC_USER_AGENT?.trim();
  if (ua) {
    if (!isAcceptableUserAgent(ua)) throw new SecError("config", 'SEC_USER_AGENT must be a name plus an email address, like "Tiger Finances you@example.com", with no web link.');
    return ua;
  }
  if (env.NODE_ENV === "production") throw new SecError("config", "SEC_USER_AGENT is not set.");
  return DEV_USER_AGENT;
}

export interface SecClientOptions {
  userAgent?: string;
  fetchImpl?: typeof fetch;
  /** Minimum gap between requests. 250ms = 4 requests/second, well under the SEC's 10/second. */
  minIntervalMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

export interface SecClient {
  getJson: (url: string) => Promise<unknown>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSecClient(opts: SecClientOptions = {}): SecClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const minInterval = opts.minIntervalMs ?? 250;
  const maxRetries = opts.maxRetries ?? 3;
  const baseBackoff = opts.baseBackoffMs ?? 1000;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const random = opts.random ?? Math.random;
  let nextSlot = 0;

  // Reserve a time slot synchronously so concurrent callers are spaced out, never bunched.
  const waitForSlot = async () => {
    const t = now();
    const start = Math.max(t, nextSlot);
    nextSlot = start + minInterval;
    if (start > t) await sleep(start - t);
  };

  const getJson = async (url: string): Promise<unknown> => {
    const userAgent = opts.userAgent ?? resolveUserAgent();
    let lastStatus = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await waitForSlot();
      let res: Response | null = null;
      try {
        res = await fetchImpl(url, {
          headers: { "User-Agent": userAgent, Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        lastStatus = 0; // network error or timeout: retry
      }
      if (res) {
        lastStatus = res.status;
        if (res.ok) {
          try {
            return await res.json();
          } catch {
            throw new SecError("invalid_data", "The SEC returned data that was not valid JSON.");
          }
        }
        if (res.status === 404) throw new SecError("not_found", "The SEC has no data at that address.");
        const retryable = res.status === 403 || res.status === 429 || res.status >= 500;
        if (!retryable) throw new SecError("upstream", `The SEC returned an unexpected status (${res.status}).`);
        // A 403 means the SEC is blocking this address, not a passing hiccup: try once more, then stop quickly.
        const limit = res.status === 403 ? Math.min(maxRetries, 1) : maxRetries;
        if (attempt >= limit) break;
        const retryAfter = Number(res.headers.get("retry-after"));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : baseBackoff * 2 ** attempt;
        await sleep(backoff + random() * 250);
      } else {
        if (attempt >= maxRetries) break;
        await sleep(baseBackoff * 2 ** attempt + random() * 250);
      }
    }
    if (lastStatus === 403 || lastStatus === 429)
      throw new SecError("rate_limited", "The SEC is limiting requests right now. Try again in a few minutes.");
    throw new SecError("upstream", "Could not reach the SEC.");
  };

  return { getJson };
}
