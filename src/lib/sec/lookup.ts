import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { findCompany, getCompanyList } from "./company-list";
import { getSavedFinancials } from "./sample";
import { financialsService } from "./service";
import { readFinancials, requestSync, type StoredFinancials } from "./store";
import { SecError, type CompanyFinancials } from "./types";
import { describeSecError } from "./user-errors";

/**
 * Where a company page gets its numbers, in order:
 *   1. the database (filled by the data-sync job; fast, and works even though the SEC blocks cloud servers)
 *   2. the SEC live (works if the SEC ever accepts this server)
 *   3. a saved copy shipped with the site (Apple, Shopify, Royal Bank only)
 *   4. otherwise, if it is a real SEC company, put it in the queue for the next sync
 */
export type Lookup =
  | { kind: "ok"; data: CompanyFinancials; origin: "database" | "live" | "saved"; retrievedAt: string | null }
  | { kind: "queued"; name: string }
  | { kind: "not_found" }
  | { kind: "error"; title: string; message: string };

export interface LookupDeps {
  readStored: (cik: string) => Promise<StoredFinancials | null>;
  live: (cik: string) => Promise<CompanyFinancials>;
  saved: (cik: string) => CompanyFinancials | null;
  /** The company's name if it is on the SEC company list, else null. */
  companyName: (cik: string) => Promise<string | null>;
  queue: (cik: string) => Promise<"queued" | "full" | "failed">;
}

export async function lookupCompany(cik: string, deps: LookupDeps): Promise<Lookup> {
  try {
    const stored = await deps.readStored(cik);
    if (stored) return { kind: "ok", data: stored.financials, origin: "database", retrievedAt: stored.retrievedAt };
  } catch (err) {
    console.error("Stored company data unavailable, trying other sources.", err instanceof Error ? err.message : err);
  }

  let transient = describeSecError(new Error("unknown"));
  try {
    const data = await deps.live(cik);
    return { kind: "ok", data, origin: "live", retrievedAt: data.source.retrievedAt };
  } catch (err) {
    if (err instanceof SecError && err.code === "not_found") return { kind: "not_found" };
    const info = describeSecError(err);
    if (!info.canFallBack) return { kind: "error", title: info.title, message: info.message };
    transient = info;
  }

  const saved = deps.saved(cik);
  if (saved) return { kind: "ok", data: saved, origin: "saved", retrievedAt: null };

  const name = await deps.companyName(cik).catch(() => null);
  if (name) {
    const result = await deps.queue(cik).catch(() => "failed" as const);
    if (result === "queued") return { kind: "queued", name };
    if (result === "full")
      return { kind: "error", title: "We are not adding new companies right now", message: "Too many companies are waiting to be added. Please try again later." };
  }
  return { kind: "error", title: transient.title, message: transient.message };
}

export function defaultLookupDeps(): LookupDeps {
  return {
    readStored: async (cik) => {
      const db = createPublicClient();
      return db ? readFinancials(db, cik) : null;
    },
    live: async (cik) => (await financialsService.getCompanyFinancials(cik)).data,
    saved: getSavedFinancials,
    companyName: async (cik) => findCompany(await getCompanyList(), cik)?.name ?? null,
    queue: async (cik) => {
      try {
        return await requestSync(createAdminClient(), cik);
      } catch (err) {
        console.error("Could not queue a company for syncing.", err instanceof Error ? err.message : err);
        return "failed";
      }
    },
  };
}

export const lookup = (cik: string) => lookupCompany(cik, defaultLookupDeps());
