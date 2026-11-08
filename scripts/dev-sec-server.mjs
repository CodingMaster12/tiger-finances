// Local stand-in for data.sec.gov, for development and browser testing only.
// Serves the saved fixtures for Apple, Shopify and Royal Bank, plus two special test companies:
//   CIK 0000000001: has a profile but no financial data (the "not covered" case)
//   CIK 0000000002: always answers 403 (the "SEC is limiting requests" case)
// Run:   node scripts/dev-sec-server.mjs [--block] [--port=4010]
//   --block  answers 403 for everything (to test the saved-copy fallback)
// Then:  SEC_DATA_ORIGIN=http://localhost:4010 npm run dev
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const block = process.argv.includes("--block");
const port = Number((process.argv.find((a) => a.startsWith("--port=")) ?? "--port=4010").split("=")[1]);
const dir = new URL("../src/lib/sec/__fixtures__/", import.meta.url);
const byCik = { "0000320193": "aapl", "0001594805": "shop", "0001000275": "ry" };
const read = (name, kind) => readFileSync(new URL(`${name}.${kind}.json`, dir), "utf8");

const server = createServer((req, res) => {
  const url = req.url ?? "";
  const send = (status, body, type = "application/json") => {
    res.writeHead(status, { "Content-Type": type });
    res.end(body);
  };
  console.log(new Date().toISOString().slice(11, 19), req.method, url, req.headers["user-agent"] ?? "(no user agent)");
  if (block) return send(403, "<html><title>SEC.gov | Request Rate Threshold Exceeded</title></html>", "text/html");
  const sub = url.match(/^\/submissions\/CIK(\d{10})\.json$/);
  const facts = url.match(/^\/api\/xbrl\/companyfacts\/CIK(\d{10})\.json$/);
  const cik = (sub ?? facts)?.[1];
  if (!cik) return send(404, JSON.stringify({ error: "not found" }));
  if (cik === "0000000002") return send(403, "<html>blocked</html>", "text/html");
  if (cik === "0000000001") {
    if (facts) return send(404, JSON.stringify({ error: "no facts" }));
    return send(200, JSON.stringify({ cik: "0000000001", name: "TEST NOT COVERED CO", tickers: ["TNC"], exchanges: ["Nasdaq"], sic: "7372", sicDescription: "Services-Prepackaged Software", fiscalYearEnd: "1231" }));
  }
  const name = byCik[cik];
  if (!name) return send(404, JSON.stringify({ error: "not found" }));
  return send(200, read(name, sub ? "submissions" : "facts"));
});
server.listen(port, () => console.log(`Fake SEC data server on http://localhost:${port}${block ? " (blocking everything with 403)" : ""}`));
