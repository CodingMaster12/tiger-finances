// Downloads the SEC's official ticker list and saves it into the repo (src/lib/sec/data/company-tickers.json).
// Run on your own computer:  SEC_USER_AGENT="Tiger Finances you@example.com" npm run sec:tickers
// The SEC requires a contact in the User-Agent and limits request rates. This script makes exactly ONE request.
import { writeFileSync } from "node:fs";

const ua = process.env.SEC_USER_AGENT;
if (!ua || !/@|https?:\/\//.test(ua)) {
  console.error('Set SEC_USER_AGENT first, for example:\n  SEC_USER_AGENT="Tiger Finances you@example.com" npm run sec:tickers');
  process.exit(1);
}
const url = "https://www.sec.gov/files/company_tickers_exchange.json";
const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "application/json" } });
if (!res.ok) {
  console.error(`SEC answered ${res.status}. If this says 403, wait 10 minutes and try once more (the SEC throttles busy addresses).`);
  process.exit(1);
}
const raw = await res.json();
const fields = raw.fields;
const idx = Object.fromEntries(["cik", "name", "ticker", "exchange"].map((f) => [f, fields?.indexOf(f)]));
if (!Array.isArray(raw.data) || Object.values(idx).some((i) => i === undefined || i < 0)) {
  console.error("Unexpected file format from the SEC. Nothing was saved.");
  process.exit(1);
}
const entries = raw.data
  .map((r) => [Number(r[idx.cik]), String(r[idx.name]), String(r[idx.ticker]).toUpperCase(), r[idx.exchange] ? String(r[idx.exchange]) : null])
  .filter((e) => Number.isInteger(e[0]) && e[1] && e[2]);
if (entries.length < 1000) {
  console.error(`Only ${entries.length} entries; that looks wrong. Nothing was saved.`);
  process.exit(1);
}
const out = { generatedAt: new Date().toISOString(), source: url, complete: true, entries };
writeFileSync(new URL("../src/lib/sec/data/company-tickers.json", import.meta.url), JSON.stringify(out));
console.log(`Saved ${entries.length} entries.`);
