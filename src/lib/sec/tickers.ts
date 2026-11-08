import { z } from "zod";
import snapshot from "./data/company-tickers.json";
import type { TickerEntry } from "./search";

const snapshotSchema = z.object({
  generatedAt: z.string(),
  source: z.string(),
  /** False for the tiny starter file. Run `npm run sec:tickers` to download the full SEC list. */
  complete: z.boolean(),
  entries: z.array(z.tuple([z.number(), z.string(), z.string(), z.string().nullable()])),
});

export interface TickerSnapshot {
  generatedAt: string;
  complete: boolean;
  entries: TickerEntry[];
}

export function parseTickerSnapshot(raw: unknown): TickerSnapshot {
  const p = snapshotSchema.parse(raw);
  return {
    generatedAt: p.generatedAt,
    complete: p.complete,
    entries: p.entries.map(([cik, name, ticker, exchange]) => ({ cik: String(cik).padStart(10, "0"), name, ticker, exchange })),
  };
}

let cached: TickerSnapshot | null = null;
export function loadTickerSnapshot(): TickerSnapshot {
  return (cached ??= parseTickerSnapshot(snapshot));
}
