// Runs automatically before `npm run build` (including on Vercel). Tries to refresh the SEC company list so
// search covers every SEC company. It can NEVER fail the build: with no contact setting, a fresh list, or any
// error, it keeps the list already in the repo and exits successfully.
import { readFileSync, writeFileSync } from "node:fs";
import { downloadTickerSnapshot, isValidUserAgent, SNAPSHOT_FILE } from "./lib/sec-tickers.mjs";

const log = (m) => console.log(`[company list] ${m}`);
try {
  const ua = process.env.SEC_USER_AGENT;
  if (!isValidUserAgent(ua)) {
    log("SEC_USER_AGENT is not set, keeping the list that is already in the repo.");
  } else {
    const current = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
    const ageDays = (Date.now() - Date.parse(current.generatedAt)) / 86_400_000;
    if (current.complete && ageDays < 7) {
      log(`the saved list is ${ageDays.toFixed(1)} days old, no refresh needed.`);
    } else {
      const snapshot = await downloadTickerSnapshot(ua, { timeoutMs: 20_000 });
      writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));
      log(`refreshed from the SEC: ${snapshot.entries.length} companies.`);
    }
  }
} catch (err) {
  log(`could not refresh (${err.message}), keeping the list that is already in the repo.`);
}
process.exit(0);
