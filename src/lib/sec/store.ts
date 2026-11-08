import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { TickerEntry } from "./search";
import { companyFinancialsSchema, FINANCIALS_SCHEMA_VERSION, type CompanyFinancials } from "./types";

/**
 * Reading and writing the SEC tables in Supabase. Used by the website (reads, with the public client; queue
 * writes, with the admin client) and by the data-sync job (all writes, with the admin client).
 * Rows are validated on the way out; a bad or outdated row is ignored, never shown.
 */
export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

const fail = (what: string, error: { message: string }): never => {
  throw new StoreError(`${what}: ${error.message}`);
};

export const MAX_QUEUE_ATTEMPTS = 3;
export const MAX_PENDING_REQUESTS = 500;
export const MAX_STORED_COMPANIES = 3000;

export interface StoredFinancials {
  financials: CompanyFinancials;
  retrievedAt: string;
  updatedAt: string;
}

export async function readFinancials(db: SupabaseClient, cik: string): Promise<StoredFinancials | null> {
  const { data, error } = await db
    .from("company_financials")
    .select("data, schema_version, retrieved_at, updated_at")
    .eq("cik", cik)
    .maybeSingle();
  if (error) return fail("Could not read company data", error);
  if (!data || data.schema_version !== FINANCIALS_SCHEMA_VERSION) return null;
  const parsed = companyFinancialsSchema.safeParse(data.data);
  if (!parsed.success) return null;
  return { financials: parsed.data, retrievedAt: data.retrieved_at, updatedAt: data.updated_at };
}

export async function writeFinancials(db: SupabaseClient, f: CompanyFinancials, retrievedAt: string): Promise<void> {
  const { error } = await db.from("company_financials").upsert(
    {
      cik: f.company.cik,
      name: f.company.name,
      tickers: f.company.tickers,
      data: f,
      schema_version: FINANCIALS_SCHEMA_VERSION,
      retrieved_at: retrievedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cik" },
  );
  if (error) fail("Could not save company data", error);
}

const entriesSchema = z.array(z.tuple([z.number(), z.string(), z.string(), z.string().nullable()]));

export async function readCompanyList(db: SupabaseClient): Promise<{ entries: TickerEntry[]; generatedAt: string } | null> {
  const { data, error } = await db.from("sec_company_list").select("entries, generated_at").eq("id", 1).maybeSingle();
  if (error) return fail("Could not read the company list", error);
  if (!data) return null;
  const parsed = entriesSchema.safeParse(data.entries);
  if (!parsed.success || parsed.data.length === 0) return null;
  return {
    generatedAt: data.generated_at,
    entries: parsed.data.map(([cik, name, ticker, exchange]) => ({ cik: String(cik).padStart(10, "0"), name, ticker, exchange })),
  };
}

export async function writeCompanyList(db: SupabaseClient, entries: [number, string, string, string | null][], generatedAt: string): Promise<void> {
  const { error } = await db.from("sec_company_list").upsert({ id: 1, entries, generated_at: generatedAt, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) fail("Could not save the company list", error);
}

// --- request queue (service role only) --------------------------------------------------------

/** Ask for a company to be fetched by the next sync. Returns "full" instead of growing the queue without limit. */
export async function requestSync(db: SupabaseClient, cik: string): Promise<"queued" | "full"> {
  const pending = await db.from("sync_requests").select("cik", { count: "exact", head: true }).lt("attempts", MAX_QUEUE_ATTEMPTS);
  if (pending.error) return fail("Could not check the request queue", pending.error);
  if ((pending.count ?? 0) >= MAX_PENDING_REQUESTS) return "full";
  const { error } = await db.from("sync_requests").upsert({ cik }, { onConflict: "cik", ignoreDuplicates: true });
  if (error) return fail("Could not queue the request", error);
  return "queued";
}

export async function listSyncQueue(db: SupabaseClient, limit: number): Promise<string[]> {
  const { data, error } = await db.from("sync_requests").select("cik").lt("attempts", MAX_QUEUE_ATTEMPTS).order("requested_at", { ascending: true }).limit(limit);
  if (error) return fail("Could not read the request queue", error);
  return (data ?? []).map((r) => r.cik as string);
}

/** Success removes the request. Failure counts an attempt; after the limit the request is left alone. */
export async function recordSyncResult(db: SupabaseClient, cik: string, error?: string): Promise<void> {
  if (!error) {
    const res = await db.from("sync_requests").delete().eq("cik", cik);
    if (res.error) fail("Could not clear the request", res.error);
    return;
  }
  const current = await db.from("sync_requests").select("attempts").eq("cik", cik).maybeSingle();
  if (current.error) return fail("Could not read the request", current.error);
  if (!current.data) return; // not a queued request (a seed or refresh), nothing to record
  const res = await db
    .from("sync_requests")
    .update({ attempts: (current.data.attempts as number) + 1, last_attempt_at: new Date().toISOString(), last_error: error.slice(0, 300) })
    .eq("cik", cik);
  if (res.error) fail("Could not record the failure", res.error);
}

// --- what is already stored ------------------------------------------------------------------------

/** All stored CIKs with their last refresh time (paged: the API returns at most 1000 rows per request). */
export async function listStored(db: SupabaseClient): Promise<{ cik: string; retrievedAt: string; schemaVersion: number }[]> {
  const out: { cik: string; retrievedAt: string; schemaVersion: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("company_financials").select("cik, retrieved_at, schema_version").order("cik").range(from, from + 999);
    if (error) return fail("Could not list stored companies", error);
    for (const r of data ?? []) out.push({ cik: r.cik as string, retrievedAt: r.retrieved_at as string, schemaVersion: r.schema_version as number });
    if (!data || data.length < 1000) return out;
  }
}
