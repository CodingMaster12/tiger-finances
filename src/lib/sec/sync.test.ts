import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TickerEntry } from "./search";
import { runSync, type SyncDeps, type SyncOptions, type SyncStore } from "./sync";
import { FINANCIALS_SCHEMA_VERSION, SecError } from "./types";
import { MAX_STORED_COMPANIES } from "./store";

const fixture = (n: string, k: string): unknown => JSON.parse(readFileSync(`src/lib/sec/__fixtures__/${n}.${k}.json`, "utf8"));
const NAMES: Record<string, string> = { "0000320193": "aapl", "0001594805": "shop", "0001000275": "ry" };
const ORIGIN = "https://data.sec.gov";
const NOW = new Date("2026-11-09T12:00:00.000Z");

const tickerFile = () => ({
  fields: ["cik", "name", "ticker", "exchange"],
  data: [
    [320193, "Apple Inc.", "AAPL", "Nasdaq"],
    [1594805, "SHOPIFY INC.", "SHOP", "Nasdaq"],
    [1000275, "ROYAL BANK OF CANADA", "RY", "NYSE"],
    ...Array.from({ length: 1200 }, (_, i) => [5_000_000 + i, `Filler ${i} Inc`, `F${i}`, "NYSE"]),
  ],
});

function memoryStore(init: { stored?: { cik: string; retrievedAt: string; schemaVersion: number }[]; queue?: string[]; list?: TickerEntry[] | null } = {}) {
  const saved = new Map<string, { name: string; retrievedAt: string }>();
  const results: { cik: string; error?: string }[] = [];
  let list: unknown = null;
  const store: SyncStore = {
    writeFinancials: async (f, retrievedAt) => void saved.set(f.company.cik, { name: f.company.name, retrievedAt }),
    writeCompanyList: async (rows) => void (list = rows),
    readCompanyList: async () => init.list ?? null,
    listQueue: async (limit) => (init.queue ?? []).slice(0, limit),
    recordResult: async (cik, error) => void results.push({ cik, error }),
    listStored: async () => init.stored ?? [],
  };
  return { store, saved, results, getList: () => list };
}

function setup(over: { fetch?: (url: string) => Promise<unknown>; store?: Parameters<typeof memoryStore>[0] } = {}) {
  const mem = memoryStore(over.store);
  const requested: string[] = [];
  const logs: string[] = [];
  const deps: SyncDeps = {
    fetchJson: async (url) => {
      requested.push(url);
      if (over.fetch) return over.fetch(url);
      if (url.endsWith("company_tickers_exchange.json")) return tickerFile();
      const m = url.match(/CIK(\d{10})\.json$/);
      const name = m && NAMES[m[1]];
      if (!name) throw new SecError("not_found", "404");
      return fixture(name, url.includes("/submissions/") ? "submissions" : "facts");
    },
    store: mem.store,
    now: () => NOW,
    log: (m) => logs.push(m),
    dataOrigin: ORIGIN,
    fallbackList: [{ cik: "0000320193", name: "Apple Inc.", ticker: "AAPL", exchange: "Nasdaq" }],
  };
  return { ...mem, deps, requested, logs };
}
const opts = (o: Partial<SyncOptions> = {}): SyncOptions => ({ seedTickers: [], ciks: [], maxCompanies: 50, refreshAfterDays: 7, refreshList: true, ...o });

describe("runSync: seeds and the company list", () => {
  it("saves the company list, resolves seed tickers to CIKs and saves their statements", async () => {
    const t = setup();
    const s = await runSync(opts({ seedTickers: ["AAPL", "shop", "RY"] }), t.deps);
    expect(s).toMatchObject({ listUpdated: true, planned: 3, saved: 3, blocked: false, failed: [] });
    expect(t.getList()).toHaveLength(1203);
    expect([...t.saved.keys()].sort()).toEqual(["0000320193", "0001000275", "0001594805"]);
    expect(t.saved.get("0000320193")).toEqual({ name: "Apple Inc.", retrievedAt: NOW.toISOString() });
    expect(t.results).toEqual([{ cik: "0000320193" }, { cik: "0001594805" }, { cik: "0001000275" }]);
  });
  it("fetches profile then facts for each company from the configured origin", async () => {
    const t = setup();
    await runSync(opts({ seedTickers: ["AAPL"], refreshList: false }), t.deps);
    expect(t.requested).toEqual([`${ORIGIN}/submissions/CIK0000320193.json`, `${ORIGIN}/api/xbrl/companyfacts/CIK0000320193.json`]);
  });
  it("reports tickers the SEC list does not contain, and carries on", async () => {
    const t = setup();
    const s = await runSync(opts({ seedTickers: ["AAPL", "NOPE"] }), t.deps);
    expect(s.unknownTickers).toEqual(["NOPE"]);
    expect(s.saved).toBe(1);
  });
  it("skips companies that are already saved and fresh", async () => {
    const t = setup({ store: { stored: [{ cik: "0000320193", retrievedAt: "2026-11-08T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION }] } });
    const s = await runSync(opts({ seedTickers: ["AAPL", "SHOP"] }), t.deps);
    expect([...t.saved.keys()]).toEqual(["0001594805"]);
    expect(s.planned).toBe(1);
  });
  it("uses the saved list, then the starter list, when it is told not to refresh", async () => {
    const t = setup({ store: { list: [{ cik: "0001594805", name: "SHOPIFY INC.", ticker: "SHOP", exchange: "Nasdaq" }] } });
    const s = await runSync(opts({ seedTickers: ["SHOP", "AAPL"], refreshList: false }), t.deps);
    expect(s.saved).toBe(1);
    expect(s.unknownTickers).toEqual(["AAPL"]);
    const t2 = setup();
    expect((await runSync(opts({ seedTickers: ["AAPL"], refreshList: false }), t2.deps)).saved).toBe(1);
  });
  it("keeps going with the saved list if refreshing the list fails for an ordinary reason", async () => {
    const t = setup({
      fetch: async (url) => {
        if (url.endsWith("company_tickers_exchange.json")) throw new Error("timeout");
        const m = url.match(/CIK(\d{10})\.json$/)!;
        return fixture(NAMES[m[1]], url.includes("/submissions/") ? "submissions" : "facts");
      },
    });
    const s = await runSync(opts({ seedTickers: ["AAPL"] }), t.deps);
    expect(s).toMatchObject({ listUpdated: false, saved: 1, blocked: false });
  });
});

describe("runSync: ordering, refresh and limits", () => {
  it("does queued requests first, then explicit CIKs, then missing seeds, then the stalest", async () => {
    const t = setup({
      store: {
        queue: ["0001000275"],
        stored: [{ cik: "0001594805", retrievedAt: "2026-01-01T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION }],
      },
    });
    await runSync(opts({ seedTickers: ["AAPL"], ciks: ["320193"] }), t.deps);
    expect([...t.saved.keys()]).toEqual(["0001000275", "0000320193", "0001594805"]);
  });
  it("refreshes stale rows and rows with an old schema version, oldest first", async () => {
    const t = setup({
      store: {
        stored: [
          { cik: "0000320193", retrievedAt: "2026-11-01T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION }, // 8 days: stale
          { cik: "0001594805", retrievedAt: "2026-11-09T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION - 1 }, // fresh but old schema
          { cik: "0001000275", retrievedAt: "2026-11-08T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION }, // fresh: untouched
        ],
      },
    });
    const s = await runSync(opts({ refreshList: false }), t.deps);
    expect(s.planned).toBe(2);
    expect([...t.saved.keys()].sort()).toEqual(["0000320193", "0001594805"]);
  });
  it("never plans more than the per-run limit", async () => {
    const t = setup();
    const s = await runSync(opts({ seedTickers: ["AAPL", "SHOP", "RY"], maxCompanies: 2 }), t.deps);
    expect(s.planned).toBe(2);
    expect(t.saved.size).toBe(2);
  });
  it("stops adding new companies at the database size limit but still refreshes existing ones", async () => {
    const stored = Array.from({ length: MAX_STORED_COMPANIES }, (_, i) => ({ cik: String(9_000_000 + i).padStart(10, "0"), retrievedAt: "2026-11-09T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION }));
    stored[0] = { cik: "0000320193", retrievedAt: "2026-01-01T00:00:00Z", schemaVersion: FINANCIALS_SCHEMA_VERSION };
    const t = setup({ store: { stored } });
    const s = await runSync(opts({ ciks: ["1594805"], refreshList: false }), t.deps);
    expect([...t.saved.keys()]).toEqual(["0000320193"]);
    expect(s.planned).toBe(1);
    expect(t.logs.join(" ")).toMatch(/Skipping 0001594805/);
  });
});

describe("runSync: failures", () => {
  it("records a company with no structured data as not covered and keeps going", async () => {
    const t = setup({
      store: { queue: ["0000000001"] },
      fetch: async (url) => {
        if (url.endsWith("company_tickers_exchange.json")) return tickerFile();
        const m = url.match(/CIK(\d{10})\.json$/)!;
        if (m[1] === "0000000001") {
          if (url.includes("companyfacts")) throw new SecError("not_found", "404");
          return fixture("aapl", "submissions");
        }
        return fixture(NAMES[m[1]], url.includes("/submissions/") ? "submissions" : "facts");
      },
    });
    const s = await runSync(opts({ seedTickers: ["AAPL"] }), t.deps);
    expect(s.failed).toEqual([{ cik: "0000000001", error: "not_covered" }]);
    expect(s.saved).toBe(1);
    expect(t.results).toContainEqual({ cik: "0000000001", error: "not_covered" });
  });
  it("carries on when only the company-list server refuses, because the data server may still accept us", async () => {
    const t = setup({
      fetch: async (url) => {
        if (url.endsWith("company_tickers_exchange.json")) throw new SecError("rate_limited", "403");
        const m = url.match(/CIK(\d{10})\.json$/)!;
        return fixture(NAMES[m[1]], url.includes("/submissions/") ? "submissions" : "facts");
      },
    });
    const s = await runSync(opts({ ciks: ["320193"] }), t.deps);
    expect(s).toMatchObject({ listUpdated: false, saved: 1, blocked: false });
    expect(t.logs.join(" ")).toMatch(/company-list server \(www\.sec\.gov\) refused/);
  });
  it("stops at once, changing nothing, when the data server refuses the connection", async () => {
    const t = setup({ fetch: async () => Promise.reject(new SecError("rate_limited", "403")) });
    const s = await runSync(opts({ ciks: ["320193", "1594805"] }), t.deps);
    expect(s).toMatchObject({ blocked: true, saved: 0, listUpdated: false });
    expect(t.requested.filter((u) => u.includes("data.sec.gov"))).toHaveLength(1); // gave up after the first data request
    expect(t.saved.size).toBe(0);
  });
  it("uses a company list supplied from a file instead of fetching one", async () => {
    const t = setup();
    const rows = [[320193, "Apple Inc.", "AAPL", "Nasdaq"], [1594805, "SHOPIFY INC.", "SHOP", "Nasdaq"]] as [number, string, string, string | null][];
    const s = await runSync(opts({ seedTickers: ["SHOP"], listRows: rows }), t.deps);
    expect(s).toMatchObject({ listUpdated: true, saved: 1 });
    expect(t.getList()).toEqual(rows);
    expect(t.requested.some((u) => u.endsWith("company_tickers_exchange.json"))).toBe(false);
  });
  it("stops mid-run if the SEC starts refusing, keeping what was already saved", async () => {
    let n = 0;
    const t = setup({
      fetch: async (url) => {
        if (url.endsWith("company_tickers_exchange.json")) return tickerFile();
        if (++n > 2) throw new SecError("rate_limited", "403");
        const m = url.match(/CIK(\d{10})\.json$/)!;
        return fixture(NAMES[m[1]], url.includes("/submissions/") ? "submissions" : "facts");
      },
    });
    const s = await runSync(opts({ seedTickers: ["AAPL", "SHOP", "RY"] }), t.deps);
    expect(s).toMatchObject({ blocked: true, saved: 1 });
    expect([...t.saved.keys()]).toEqual(["0000320193"]);
  });
  it("records an unreadable payload as a failure and carries on", async () => {
    const t = setup({
      fetch: async (url) => {
        if (url.endsWith("company_tickers_exchange.json")) return tickerFile();
        if (url.includes("CIK0000320193") && url.includes("companyfacts")) return { nope: true };
        const m = url.match(/CIK(\d{10})\.json$/)!;
        return fixture(NAMES[m[1]], url.includes("/submissions/") ? "submissions" : "facts");
      },
    });
    const s = await runSync(opts({ seedTickers: ["AAPL", "SHOP"] }), t.deps);
    expect(s.failed).toEqual([{ cik: "0000320193", error: "invalid_data" }]);
    expect(s.saved).toBe(1);
  });
});
