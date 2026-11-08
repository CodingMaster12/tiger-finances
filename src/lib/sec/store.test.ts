import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { listStored, listSyncQueue, readCompanyList, readFinancials, recordSyncResult, requestSync, StoreError, writeCompanyList, writeFinancials, MAX_PENDING_REQUESTS } from "./store";
import { buildFinancials } from "./statements";
import { FINANCIALS_SCHEMA_VERSION } from "./types";

const load = (n: string, k: string): unknown => JSON.parse(readFileSync(`src/lib/sec/__fixtures__/${n}.${k}.json`, "utf8"));
const apple = buildFinancials(load("aapl", "facts"), load("aapl", "submissions"), "2026-11-09T00:00:00.000Z");

/** A recording stand-in for the Supabase query builder: every method returns itself; awaiting gives `result`. */
function fakeDb(results: Record<string, unknown> | ((table: string) => unknown)) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const db = {
    from(table: string) {
      const result = typeof results === "function" ? results(table) : (results[table] ?? { data: null, error: null });
      const chain: Record<string, unknown> = {};
      for (const op of ["select", "upsert", "update", "delete", "eq", "lt", "order", "limit", "range"]) {
        chain[op] = (...args: unknown[]) => {
          calls.push({ table, op, args });
          return chain;
        };
      }
      chain.maybeSingle = () => Promise.resolve(result);
      chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
      return chain;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

describe("readFinancials", () => {
  const row = (over: object = {}) => ({ data: { data: apple, schema_version: FINANCIALS_SCHEMA_VERSION, retrieved_at: "2026-11-09T00:00:00Z", updated_at: "2026-11-09T00:00:01Z", ...over }, error: null });
  it("returns validated statements with their retrieval time", async () => {
    const { db } = fakeDb({ company_financials: row() });
    const r = await readFinancials(db, "0000320193");
    expect(r?.financials.company.name).toBe("Apple Inc.");
    expect(r?.retrievedAt).toBe("2026-11-09T00:00:00Z");
  });
  it("ignores a row with another schema version", async () => {
    expect(await readFinancials(fakeDb({ company_financials: row({ schema_version: 99 }) }).db, "0000320193")).toBeNull();
  });
  it("ignores a row whose JSON no longer matches the expected shape", async () => {
    expect(await readFinancials(fakeDb({ company_financials: row({ data: { company: {} } }) }).db, "0000320193")).toBeNull();
  });
  it("returns null for a missing company and throws a StoreError on a database error", async () => {
    expect(await readFinancials(fakeDb({}).db, "0000320193")).toBeNull();
    await expect(readFinancials(fakeDb({ company_financials: { data: null, error: { message: "boom" } } }).db, "0000320193")).rejects.toBeInstanceOf(StoreError);
  });
});

describe("writeFinancials", () => {
  it("upserts one row per company with name, tickers, JSON, schema version and retrieval time", async () => {
    const { db, calls } = fakeDb({});
    await writeFinancials(db, apple, "2026-11-09T00:00:00Z");
    const up = calls.find((c) => c.op === "upsert")!;
    expect(up.table).toBe("company_financials");
    expect(up.args[0]).toMatchObject({ cik: "0000320193", name: "Apple Inc.", tickers: ["AAPL"], schema_version: FINANCIALS_SCHEMA_VERSION, retrieved_at: "2026-11-09T00:00:00Z" });
    expect(up.args[1]).toEqual({ onConflict: "cik" });
  });
  it("throws a StoreError when the write fails", async () => {
    await expect(writeFinancials(fakeDb({ company_financials: { error: { message: "denied" } } }).db, apple, "x")).rejects.toBeInstanceOf(StoreError);
  });
});

describe("company list", () => {
  it("reads entries into zero-padded CIKs and rejects bad shapes or an empty list", async () => {
    const good = fakeDb({ sec_company_list: { data: { entries: [[320193, "Apple Inc.", "AAPL", "Nasdaq"]], generated_at: "2026-11-09T00:00:00Z" }, error: null } });
    expect((await readCompanyList(good.db))?.entries[0]).toEqual({ cik: "0000320193", name: "Apple Inc.", ticker: "AAPL", exchange: "Nasdaq" });
    expect(await readCompanyList(fakeDb({ sec_company_list: { data: { entries: "nope", generated_at: "x" }, error: null } }).db)).toBeNull();
    expect(await readCompanyList(fakeDb({ sec_company_list: { data: { entries: [], generated_at: "x" }, error: null } }).db)).toBeNull();
  });
  it("writes the single list row", async () => {
    const { db, calls } = fakeDb({});
    await writeCompanyList(db, [[1, "A", "A", null]], "2026-11-09T00:00:00Z");
    expect(calls.find((c) => c.op === "upsert")!.args[0]).toMatchObject({ id: 1, generated_at: "2026-11-09T00:00:00Z" });
  });
});

describe("request queue", () => {
  it("queues a company, ignoring duplicates", async () => {
    const { db, calls } = fakeDb({ sync_requests: { data: null, error: null, count: 3 } });
    expect(await requestSync(db, "0000789019")).toBe("queued");
    const up = calls.find((c) => c.op === "upsert")!;
    expect(up.args).toEqual([{ cik: "0000789019" }, { onConflict: "cik", ignoreDuplicates: true }]);
  });
  it("refuses to grow past the pending limit", async () => {
    const { db, calls } = fakeDb({ sync_requests: { data: null, error: null, count: MAX_PENDING_REQUESTS } });
    expect(await requestSync(db, "0000789019")).toBe("full");
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });
  it("lists the oldest pending requests first", async () => {
    const { db, calls } = fakeDb({ sync_requests: { data: [{ cik: "0000000001" }, { cik: "0000000002" }], error: null } });
    expect(await listSyncQueue(db, 10)).toEqual(["0000000001", "0000000002"]);
    expect(calls.find((c) => c.op === "order")!.args).toEqual(["requested_at", { ascending: true }]);
  });
  it("clears a request on success", async () => {
    const { db, calls } = fakeDb({});
    await recordSyncResult(db, "0000789019");
    expect(calls.some((c) => c.op === "delete")).toBe(true);
  });
  it("counts an attempt on failure, and ignores companies that were never queued", async () => {
    const a = fakeDb({ sync_requests: { data: { attempts: 1 }, error: null } });
    await recordSyncResult(a.db, "0000789019", "not_covered");
    expect(a.calls.find((c) => c.op === "update")!.args[0]).toMatchObject({ attempts: 2, last_error: "not_covered" });
    const b = fakeDb({ sync_requests: { data: null, error: null } });
    await recordSyncResult(b.db, "0000789019", "x");
    expect(b.calls.some((c) => c.op === "update")).toBe(false);
  });
});

describe("listStored", () => {
  it("pages through more than 1000 rows", async () => {
    const page = (n: number) => ({ data: Array.from({ length: n }, (_, i) => ({ cik: String(i).padStart(10, "0"), retrieved_at: "x", schema_version: 1 })), error: null });
    let call = 0;
    const { db } = fakeDb(() => (call++ === 0 ? page(1000) : page(5)));
    expect(await listStored(db)).toHaveLength(1005);
  });
  it("is quiet when nothing is stored", async () => {
    expect(await listStored(fakeDb({ company_financials: { data: [], error: null } }).db)).toEqual([]);
  });
});

void vi;
