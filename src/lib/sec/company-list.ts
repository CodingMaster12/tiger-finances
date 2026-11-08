import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { createLoaderCache } from "./cache";
import type { TickerEntry } from "./search";
import { readCompanyList } from "./store";
import { loadTickerSnapshot } from "./tickers";

export interface CompanyList {
  entries: TickerEntry[];
  /** True when this is the full SEC list; false for the small starter list shipped with the site. */
  complete: boolean;
  source: "database" | "starter";
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const cache = createLoaderCache<CompanyList>({ ttlMs: SIX_HOURS, maxEntries: 1 });

async function load(): Promise<CompanyList> {
  const db = createPublicClient();
  if (db) {
    try {
      const stored = await readCompanyList(db);
      if (stored) return { entries: stored.entries, complete: true, source: "database" };
    } catch (err) {
      console.error("Company list unavailable from the database, using the starter list.", err instanceof Error ? err.message : err);
    }
  }
  const snapshot = loadTickerSnapshot();
  return { entries: snapshot.entries, complete: snapshot.complete, source: "starter" };
}

/** The list of SEC companies for search: the full list from the database, else the starter list. Cached for hours. */
export async function getCompanyList(): Promise<CompanyList> {
  return (await cache.get("list", load)).value;
}

export function findCompany(list: CompanyList, cik: string): TickerEntry | undefined {
  return list.entries.find((e) => e.cik === cik);
}
