import { z } from "zod";

export const TICKER_FILE_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

export type TickerRow = [cik: number, name: string, ticker: string, exchange: string | null];

const fileSchema = z.object({ fields: z.array(z.string()), data: z.array(z.array(z.unknown())) });

/** Parse the SEC's company_tickers_exchange.json into rows, refusing a file that looks wrong. */
export function parseTickerFile(raw: unknown): TickerRow[] {
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The SEC company list had an unexpected format.");
  const idx = Object.fromEntries((["cik", "name", "ticker", "exchange"] as const).map((f) => [f, parsed.data.fields.indexOf(f)]));
  if (Object.values(idx).some((i) => i < 0)) throw new Error("The SEC company list is missing expected columns.");
  const rows: TickerRow[] = [];
  for (const r of parsed.data.data) {
    const cik = Number(r[idx.cik]);
    const name = String(r[idx.name] ?? "").trim();
    const ticker = String(r[idx.ticker] ?? "").trim().toUpperCase();
    const exchange = r[idx.exchange] ? String(r[idx.exchange]) : null;
    if (Number.isInteger(cik) && cik > 0 && name && ticker) rows.push([cik, name, ticker, exchange]);
  }
  if (rows.length < 1000) throw new Error(`The SEC company list has only ${rows.length} companies, which looks wrong.`);
  return rows;
}
