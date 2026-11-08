import { describe, expect, it } from "vitest";
import { parseTickerFile } from "./ticker-file";

const file = (n: number, extra: unknown[][] = []) => ({
  fields: ["cik", "name", "ticker", "exchange"],
  data: [...Array.from({ length: n }, (_, i) => [1000 + i, `Company ${i} Inc`, `t${i}`, "NYSE"]), ...extra],
});

describe("parseTickerFile", () => {
  it("parses rows, upper-casing tickers", () => {
    const rows = parseTickerFile(file(1500));
    expect(rows).toHaveLength(1500);
    expect(rows[0]).toEqual([1000, "Company 0 Inc", "T0", "NYSE"]);
  });
  it("accepts a null exchange and drops unusable rows", () => {
    const rows = parseTickerFile(file(1500, [[7, "No Exchange Co", "NEC", null], ["x", "Bad CIK", "BAD", "NYSE"], [8, "", "EMPTY", "NYSE"], [9, "No Ticker", "", "NYSE"]]));
    expect(rows).toHaveLength(1501);
    expect(rows.at(-1)).toEqual([7, "No Exchange Co", "NEC", null]);
  });
  it("accepts columns in another order", () => {
    const raw = { fields: ["ticker", "exchange", "cik", "name"], data: Array.from({ length: 1200 }, (_, i) => [`T${i}`, "NYSE", 10 + i, `Co ${i}`]) };
    expect(parseTickerFile(raw)[0]).toEqual([10, "Co 0", "T0", "NYSE"]);
  });
  it("refuses a file that is too small, malformed or missing columns", () => {
    expect(() => parseTickerFile(file(5))).toThrow(/looks wrong/);
    expect(() => parseTickerFile({ nope: 1 })).toThrow(/unexpected format/);
    expect(() => parseTickerFile({ fields: ["cik"], data: [] })).toThrow(/missing expected columns/);
  });
});
