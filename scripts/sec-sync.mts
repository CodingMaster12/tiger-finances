/**
 * Data-sync job: downloads company filings from the SEC and saves them in Supabase.
 * Run it from a connection the SEC accepts (GitHub's scheduled jobs, or your own computer). Normal use:
 *
 *   SEC_USER_AGENT="Tiger Finances you@example.com" \
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run sec:sync
 *
 * Options:
 *   --ticker=AAPL,MSFT   also fetch these tickers          --cik=320193      also fetch these company numbers
 *   --max=150            most companies per run            --refresh-days=7  re-fetch companies older than this
 *   --no-seed            skip the built-in starter list    --no-list         do not refresh the SEC company list
 *   --list-file=PATH     use a company list you downloaded in your browser from
 *                        https://www.sec.gov/files/company_tickers_exchange.json (save the page as a .json file)
 *   --dry-run            fetch nothing from Supabase, write nothing (still talks to the SEC unless --fixtures)
 *   --fixtures           use the saved fixture filings instead of the SEC (offline testing of the whole pipeline)
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSecClient, isAcceptableUserAgent, resolveDataOrigin } from "../src/lib/sec/client-core";
import { SecError } from "../src/lib/sec/types";
import { runSync, type SyncStore } from "../src/lib/sec/sync";
import { parseTickerFile } from "../src/lib/sec/ticker-file";
import { listStored, listSyncQueue, readCompanyList, recordSyncResult, writeCompanyList, writeFinancials } from "../src/lib/sec/store";
import { loadTickerSnapshot } from "../src/lib/sec/tickers";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const list = (name: string) => (value(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const log = (m: string) => console.log(`[sync] ${m}`);

const dryRun = flag("dry-run");
const fixtures = flag("fixtures");

function die(message: string): never {
  console.error(`[sync] ${message}`);
  process.exit(2);
}

function makeStore(): SyncStore {
  if (dryRun) {
    return {
      writeFinancials: async (f) => log(`(dry run) would save ${f.company.name}`),
      writeCompanyList: async (rows) => log(`(dry run) would save a company list of ${rows.length}`),
      readCompanyList: async () => null,
      listQueue: async () => [],
      recordResult: async () => undefined,
      listStored: async () => [],
    };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) die("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (or use --dry-run).");
  const db: SupabaseClient = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    writeFinancials: (f, at) => writeFinancials(db, f, at),
    writeCompanyList: (rows, at) => writeCompanyList(db, rows, at),
    readCompanyList: async () => (await readCompanyList(db))?.entries ?? null,
    listQueue: (n) => listSyncQueue(db, n),
    recordResult: (cik, error) => recordSyncResult(db, cik, error),
    listStored: () => listStored(db),
  };
}

function makeFetch(): { fetchJson: (url: string) => Promise<unknown>; now: () => Date } {
  if (fixtures) {
    const byCik: Record<string, string> = { "0000320193": "aapl", "0001594805": "shop", "0001000275": "ry" };
    const dir = new URL("../src/lib/sec/__fixtures__/", import.meta.url);
    return {
      // The fixtures were downloaded from the SEC on 2026-11-08, so that is the honest retrieval date.
      now: () => new Date("2026-11-08T00:00:00.000Z"),
      fetchJson: async (url) => {
        const m = url.match(/CIK(\d{10})\.json$/);
        const name = m && byCik[m[1]];
        if (!name) throw new SecError("not_found", `No fixture for ${url}`);
        return JSON.parse(readFileSync(new URL(`${name}.${url.includes("/submissions/") ? "submissions" : "facts"}.json`, dir), "utf8"));
      },
    };
  }
  const userAgent = process.env.SEC_USER_AGENT;
  if (!isAcceptableUserAgent(userAgent)) die('SEC_USER_AGENT must be a name plus an email address with no web link, e.g. "Tiger Finances you@example.com". (The SEC refuses lines that contain a web link.)');
  // Stay well under the SEC's 10 requests/second.
  return { fetchJson: createSecClient({ userAgent, minIntervalMs: 250 }).getJson, now: () => new Date() };
}

const { fetchJson, now } = makeFetch();
const listFile = value("list-file");
let listRows: ReturnType<typeof parseTickerFile> | undefined;
if (listFile) {
  try {
    listRows = parseTickerFile(JSON.parse(readFileSync(listFile.replace(/^~(?=\/)/, process.env.HOME ?? "~"), "utf8")));
  } catch (err) {
    die(`Could not use the company list file: ${err instanceof Error ? err.message : err}`);
  }
}
const seeds = flag("no-seed") ? [] : (JSON.parse(readFileSync(new URL("./seed-tickers.json", import.meta.url), "utf8")) as string[]);

const summary = await runSync(
  {
    seedTickers: [...seeds, ...list("ticker")],
    ciks: list("cik"),
    maxCompanies: Number(value("max") ?? 150),
    refreshAfterDays: Number(value("refresh-days") ?? 7),
    refreshList: !flag("no-list") && !fixtures,
    listRows,
  },
  { fetchJson, store: makeStore(), now, log, dataOrigin: resolveDataOrigin(), fallbackList: loadTickerSnapshot().entries },
);

log(
  `Done: ${summary.saved} saved, ${summary.failed.length} failed, ${summary.planned} planned` +
    `${summary.listUpdated ? ", company list updated" : ""}${summary.blocked ? ". THE SEC REFUSED THIS CONNECTION." : "."}`,
);
if (summary.blocked) {
  console.error("[sync] The SEC blocked this connection. Run the job from a different place (for example your own computer).");
  process.exit(1);
}
if (summary.planned > 0 && summary.saved === 0) process.exit(1);
