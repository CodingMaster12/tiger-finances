/** Company search over the saved SEC ticker list. Pure and synchronous: no network at search time. */
export interface TickerEntry {
  cik: string; // 10 digits
  name: string;
  ticker: string;
  exchange: string | null;
}

export interface SearchResult {
  cik: string;
  name: string;
  tickers: { ticker: string; exchange: string | null }[];
  /** Set when the query looked like a non-US listing, e.g. "SHOP.TO". */
  note?: string;
}

const CANADIAN_SUFFIX = /\.(TO|V|CN|NE)$/i;

/** "shop.to" -> SHOP, "brk.b" -> BRK-B (the SEC writes share classes with a dash). */
export function normalizeTicker(input: string): { ticker: string; stripped: boolean } {
  let t = input.trim().toUpperCase();
  const stripped = CANADIAN_SUFFIX.test(t);
  t = t.replace(CANADIAN_SUFFIX, "").replace(/\./g, "-").replace(/\s+/g, "");
  return { ticker: t, stripped };
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function searchCompanies(entries: readonly TickerEntry[], query: string, limit = 10): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const { ticker, stripped } = normalizeTicker(q);
  const tokens = words(q);

  const scored: { entry: TickerEntry; rank: number }[] = [];
  for (const entry of entries) {
    let rank = Infinity;
    if (entry.ticker === ticker) rank = 0;
    else if (ticker.length >= 1 && entry.ticker.startsWith(ticker)) rank = 1;
    if (tokens.length) {
      const nameWords = words(entry.name);
      if (tokens.every((t) => nameWords.some((w) => w.startsWith(t)))) rank = Math.min(rank, 2);
      else if (q.length >= 3 && entry.name.toLowerCase().includes(q.toLowerCase())) rank = Math.min(rank, 3);
    }
    if (rank < Infinity) scored.push({ entry, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name) || a.entry.ticker.localeCompare(b.entry.ticker));

  // One result per company, listing every ticker the company has (share classes together).
  const byCik = new Map<string, SearchResult>();
  for (const { entry, rank } of scored) {
    if (byCik.has(entry.cik) || byCik.size >= limit) continue;
    const r: SearchResult = { cik: entry.cik, name: entry.name, tickers: [] };
    if (stripped && rank === 0) r.note = "Canadian listing symbol. SEC data covers the company's US-registered filings.";
    byCik.set(entry.cik, r);
  }
  for (const entry of entries) byCik.get(entry.cik)?.tickers.push({ ticker: entry.ticker, exchange: entry.exchange });
  return [...byCik.values()];
}
