// Downloads the SEC's official ticker list into the repo (src/lib/sec/data/company-tickers.json).
// Run on your own computer:  SEC_USER_AGENT="Tiger Finances https://github.com/CodingMaster12/tiger-finances" npm run sec:tickers
// (The site also tries this automatically before every build; see prebuild-tickers.mjs.)
import { writeFileSync } from "node:fs";
import { downloadTickerSnapshot, isValidUserAgent, SNAPSHOT_FILE } from "./lib/sec-tickers.mjs";

const ua = process.env.SEC_USER_AGENT;
if (!isValidUserAgent(ua)) {
  console.error('Set SEC_USER_AGENT first, for example:\n  SEC_USER_AGENT="Tiger Finances https://github.com/CodingMaster12/tiger-finances" npm run sec:tickers');
  process.exit(1);
}
try {
  const snapshot = await downloadTickerSnapshot(ua);
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));
  console.log(`Saved ${snapshot.entries.length} companies.`);
} catch (err) {
  console.error(`Could not download the list: ${err.message}. If the SEC said 403, wait 10 minutes and try once more. Nothing was saved.`);
  process.exit(1);
}
