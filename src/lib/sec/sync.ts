import type { TickerEntry } from "./search";
import { buildFinancials, padCik } from "./statements";
import { MAX_STORED_COMPANIES } from "./store";
import { parseTickerFile, TICKER_FILE_URL, type TickerRow } from "./ticker-file";
import { FINANCIALS_SCHEMA_VERSION, SecError } from "./types";

/**
 * The data-sync job: fetch company filings from the SEC (from a connection the SEC accepts), turn them into
 * normalized statements and save them to the database. Everything outside the SEC and the database is passed
 * in, so this logic is tested with real saved filings and an in-memory store.
 */
export interface SyncStore {
  writeFinancials: (f: ReturnType<typeof buildFinancials>, retrievedAt: string) => Promise<void>;
  writeCompanyList: (rows: TickerRow[], generatedAt: string) => Promise<void>;
  readCompanyList: () => Promise<TickerEntry[] | null>;
  listQueue: (limit: number) => Promise<string[]>;
  recordResult: (cik: string, error?: string) => Promise<void>;
  listStored: () => Promise<{ cik: string; retrievedAt: string; schemaVersion: number }[]>;
}

export interface SyncDeps {
  fetchJson: (url: string) => Promise<unknown>;
  store: SyncStore;
  now: () => Date;
  log: (message: string) => void;
  /** Where data.sec.gov lives (a local fixture server in tests). */
  dataOrigin: string;
  /** The starter list shipped with the site, used to resolve tickers if no other list exists. */
  fallbackList: TickerEntry[];
}

export interface SyncOptions {
  seedTickers: string[];
  ciks: string[];
  maxCompanies: number;
  refreshAfterDays: number;
  refreshList: boolean;
  /** A company list the owner downloaded in a browser (the SEC's list server often refuses scripts). Used instead of fetching. */
  listRows?: TickerRow[];
}

export interface SyncSummary {
  listUpdated: boolean;
  planned: number;
  saved: number;
  failed: { cik: string; error: string }[];
  unknownTickers: string[];
  /** True when the SEC refused this connection; the run stops at once because retrying only makes it worse. */
  blocked: boolean;
}

const DAY = 86_400_000;

export async function runSync(opts: SyncOptions, deps: SyncDeps): Promise<SyncSummary> {
  const { store, log } = deps;
  const summary: SyncSummary = { listUpdated: false, planned: 0, saved: 0, failed: [], unknownTickers: [], blocked: false };
  const now = deps.now();

  // 1. The company list (resolves tickers, powers search). It lives on a different SEC server (www.sec.gov) than the
  //    financial data (data.sec.gov), and that server often refuses scripts. A refusal here is NOT fatal: we carry on
  //    with the saved list and let the data requests below decide whether the SEC accepts this connection.
  let entries: TickerEntry[] | null = null;
  if (opts.listRows || opts.refreshList) {
    try {
      const rows = opts.listRows ?? parseTickerFile(await deps.fetchJson(TICKER_FILE_URL));
      await store.writeCompanyList(rows, now.toISOString());
      entries = rows.map(([cik, name, ticker, exchange]) => ({ cik: padCik(cik), name, ticker, exchange }));
      summary.listUpdated = true;
      log(`Company list saved: ${rows.length} companies${opts.listRows ? " (from the file you provided)" : ""}.`);
    } catch (err) {
      const refused = err instanceof SecError && err.code === "rate_limited";
      log(
        refused
          ? "The SEC's company-list server (www.sec.gov) refused this connection. Carrying on without refreshing the list; the saved list stays in use. (You can supply the list yourself with --list-file.)"
          : `Could not refresh the company list (${err instanceof Error ? err.message : err}); using the saved one.`,
      );
    }
  }
  entries ??= (await store.readCompanyList()) ?? deps.fallbackList;

  // 2. Decide what to fetch, most important first.
  const stored = await store.listStored();
  const storedByCik = new Map(stored.map((s) => [s.cik, s]));
  const byTicker = new Map<string, TickerEntry>();
  for (const e of entries) if (!byTicker.has(e.ticker)) byTicker.set(e.ticker, e);

  const seedCiks: string[] = [];
  for (const t of opts.seedTickers) {
    const hit = byTicker.get(t.toUpperCase());
    if (hit) seedCiks.push(hit.cik);
    else summary.unknownTickers.push(t);
  }
  const staleBefore = now.getTime() - opts.refreshAfterDays * DAY;
  const stale = stored
    .filter((s) => s.schemaVersion !== FINANCIALS_SCHEMA_VERSION || Date.parse(s.retrievedAt) < staleBefore)
    .sort((a, b) => Date.parse(a.retrievedAt) - Date.parse(b.retrievedAt))
    .map((s) => s.cik);

  const ordered = [
    ...(await store.listQueue(opts.maxCompanies)),
    ...opts.ciks.map(padCik),
    ...seedCiks.filter((c) => !storedByCik.has(c)),
    ...stale,
  ];
  let room = Math.max(0, MAX_STORED_COMPANIES - stored.length);
  const plan: string[] = [];
  for (const cik of new Set(ordered)) {
    if (plan.length >= opts.maxCompanies) break;
    if (!storedByCik.has(cik)) {
      if (room <= 0) {
        log(`Skipping ${cik}: the database already holds ${MAX_STORED_COMPANIES} companies (the free-tier limit we set).`);
        continue;
      }
      room -= 1;
    }
    plan.push(cik);
  }
  summary.planned = plan.length;
  log(`Plan: ${plan.length} companies to fetch (${stored.length} already saved).`);
  if (summary.unknownTickers.length) log(`Tickers not found on the SEC list: ${summary.unknownTickers.join(", ")}.`);

  // 3. Fetch, convert, save. Stop immediately if the SEC refuses us.
  for (const cik of plan) {
    try {
      const profile = await deps.fetchJson(`${deps.dataOrigin}/submissions/CIK${cik}.json`);
      let facts: unknown;
      try {
        facts = await deps.fetchJson(`${deps.dataOrigin}/api/xbrl/companyfacts/CIK${cik}.json`);
      } catch (err) {
        if (err instanceof SecError && err.code === "not_found") throw new SecError("not_covered", "No structured financial data.");
        throw err;
      }
      const retrievedAt = deps.now().toISOString();
      const financials = buildFinancials(facts, profile, retrievedAt);
      await store.writeFinancials(financials, retrievedAt);
      await store.recordResult(cik);
      summary.saved += 1;
      log(`Saved ${financials.company.name} (${cik}).`);
    } catch (err) {
      if (err instanceof SecError && err.code === "rate_limited") {
        summary.blocked = true;
        log(`The SEC refused this connection while fetching ${cik}. Stopping.`);
        break;
      }
      const code = err instanceof SecError ? err.code : "error";
      const message = err instanceof Error ? err.message : String(err);
      summary.failed.push({ cik, error: code });
      log(`Could not save ${cik}: ${code} (${message}).`);
      await store.recordResult(cik, code).catch(() => undefined);
    }
  }
  return summary;
}
