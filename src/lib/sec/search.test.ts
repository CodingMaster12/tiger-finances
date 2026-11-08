import { describe, expect, it } from "vitest";
import { normalizeTicker, searchCompanies, type TickerEntry } from "./search";
import { loadTickerSnapshot, parseTickerSnapshot } from "./tickers";

const e = (cik: string, name: string, ticker: string, exchange: string | null = "Nasdaq"): TickerEntry => ({ cik, name, ticker, exchange });
const entries = [
  e("0000320193", "Apple Inc.", "AAPL"),
  e("0001018724", "AMAZON COM INC", "AMZN"),
  e("0001594805", "SHOPIFY INC.", "SHOP"),
  e("0000000001", "Shop Direct Holdings", "SHPD", "NYSE"),
  e("0001067983", "BERKSHIRE HATHAWAY INC", "BRK-B", "NYSE"),
  e("0001067983", "BERKSHIRE HATHAWAY INC", "BRK-A", "NYSE"),
  e("0001000275", "ROYAL BANK OF CANADA", "RY", "NYSE"),
];

describe("normalizeTicker", () => {
  it("uppercases, strips Canadian suffixes and uses the SEC's dash for share classes", () => {
    expect(normalizeTicker("shop.to")).toEqual({ ticker: "SHOP", stripped: true });
    expect(normalizeTicker(" brk.b ")).toEqual({ ticker: "BRK-B", stripped: false });
    expect(normalizeTicker("RY.V").stripped).toBe(true);
  });
});

describe("searchCompanies", () => {
  it("ranks an exact ticker before prefix and name matches", () => {
    expect(searchCompanies(entries, "shop").map((r) => r.name)).toEqual(["SHOPIFY INC.", "Shop Direct Holdings"]);
  });
  it("matches by name words", () => {
    expect(searchCompanies(entries, "royal bank")[0].cik).toBe("0001000275");
    expect(searchCompanies(entries, "ama")[0].tickers[0].ticker).toBe("AMZN");
  });
  it("finds share classes from either spelling and groups them under one company", () => {
    const r = searchCompanies(entries, "BRK.B");
    expect(r).toHaveLength(1);
    expect(r[0].tickers.map((t) => t.ticker).sort()).toEqual(["BRK-A", "BRK-B"]);
  });
  it("explains a Canadian listing symbol", () => {
    const r = searchCompanies(entries, "SHOP.TO");
    expect(r[0].cik).toBe("0001594805");
    expect(r[0].note).toMatch(/Canadian listing/);
  });
  it("returns nothing for empty, whitespace or unknown queries", () => {
    expect(searchCompanies(entries, "")).toEqual([]);
    expect(searchCompanies(entries, "   ")).toEqual([]);
    expect(searchCompanies(entries, "zzzzzz")).toEqual([]);
  });
  it("respects the result limit", () => {
    expect(searchCompanies(entries, "a", 2)).toHaveLength(2);
  });
});

describe("ticker snapshot", () => {
  it("parses entries into zero-padded CIKs", () => {
    const s = parseTickerSnapshot({ generatedAt: "x", source: "y", complete: true, entries: [[320193, "Apple Inc.", "AAPL", "Nasdaq"]] });
    expect(s.entries[0]).toEqual({ cik: "0000320193", name: "Apple Inc.", ticker: "AAPL", exchange: "Nasdaq" });
  });
  it("rejects a malformed snapshot", () => {
    expect(() => parseTickerSnapshot({ entries: "no" })).toThrow();
  });
  it("loads the file that ships in the repo and finds the starter companies", () => {
    const snap = loadTickerSnapshot();
    expect(searchCompanies(snap.entries, "AAPL")[0].cik).toBe("0000320193");
    expect(searchCompanies(snap.entries, "RY")[0].name).toMatch(/ROYAL BANK/);
  });
});
