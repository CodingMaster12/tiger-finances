// Shared by `npm run sec:tickers` (manual) and the automatic refresh that runs before every build.
// Makes exactly ONE request to the SEC's public ticker list and validates it before returning.
export const TICKER_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
export const SNAPSHOT_FILE = new URL("../../src/lib/sec/data/company-tickers.json", import.meta.url);

export const isValidUserAgent = (ua) => typeof ua === "string" && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(ua) && !/https?:\/\//i.test(ua);

export async function downloadTickerSnapshot(userAgent, { timeoutMs = 30_000, url = TICKER_URL } = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`the SEC answered ${res.status}`);
  const raw = await res.json();
  const idx = Object.fromEntries(["cik", "name", "ticker", "exchange"].map((f) => [f, raw.fields?.indexOf(f)]));
  if (!Array.isArray(raw.data) || Object.values(idx).some((i) => i === undefined || i < 0)) throw new Error("unexpected file format");
  const entries = raw.data
    .map((r) => [Number(r[idx.cik]), String(r[idx.name]), String(r[idx.ticker]).toUpperCase(), r[idx.exchange] ? String(r[idx.exchange]) : null])
    .filter((e) => Number.isInteger(e[0]) && e[1] && e[2]);
  if (entries.length < 1000) throw new Error(`only ${entries.length} entries, which looks wrong`);
  return { generatedAt: new Date().toISOString(), source: TICKER_URL, complete: true, entries };
}
