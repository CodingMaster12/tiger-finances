import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { annualKeyMetrics } from "./metrics";
import { buildFinancials } from "./statements";
import type { CompanyFinancials, StatementRow } from "./types";

const load = (n: string, k: string): unknown => JSON.parse(readFileSync(`src/lib/sec/__fixtures__/${n}.${k}.json`, "utf8"));
const build = (n: string) => buildFinancials(load(n, "facts"), load(n, "submissions"), "2026-11-08T00:00:00.000Z");
const row = (f: CompanyFinancials, view: "annual" | "quarterly", key: string): StatementRow | undefined =>
  f[view].statements.flatMap((s) => s.rows).find((r) => r.key === key);

describe("Apple (US GAAP, 52/53-week fiscal year)", () => {
  const f = build("aapl");

  it("returns five annual columns, newest first, labelled by period end", () => {
    expect(f.annual.statements[0].columns.map((c) => c.periodEnd)).toEqual(["2026-09-26", "2025-09-27", "2024-09-28", "2023-09-30", "2022-09-24"]);
    expect(f.currency).toBe("USD");
    expect(f.accountingStandard).toBe("us-gaap");
    expect(f.notes).toEqual([]);
  });
  it("reports exact annual values with provenance", () => {
    const rev = row(f, "annual", "revenue")!.values[0]!;
    expect(rev).toMatchObject({ value: 478_834_000_000, unit: "USD", periodEnd: "2026-09-26", kind: "reported", form: "10-K" });
    expect(rev.concept).toBe("us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax");
    expect(rev.accession).toMatch(/^\d{10}-\d{2}-\d{6}$/);
    expect(row(f, "annual", "netIncome")!.values[0]!.value).toBe(132_175_000_000);
  });
  it("does not repeat a period when later filings restate the same number", () => {
    const rev = row(f, "annual", "revenue")!;
    expect(new Set(rev.values.map((v) => v!.periodEnd)).size).toBe(5);
    expect(rev.values[1]!.restated).toBeUndefined();
  });
  it("derives the fourth quarter as full year minus nine months (matches the figure the company reported)", () => {
    const q4 = row(f, "quarterly", "revenue")!.values[0]!;
    expect(q4).toMatchObject({ value: 114_477_000_000, kind: "calculated", periodEnd: "2026-09-26" });
    expect(f.quarterly.statements[0].columns[0]).toEqual({ periodEnd: "2026-09-26", fiscalPeriod: "Q4" });
  });
  it("never invents a fourth-quarter EPS", () => {
    expect(row(f, "quarterly", "epsDiluted")!.values[0]).toBeNull();
    expect(row(f, "quarterly", "epsDiluted")!.values[1]!.kind).toBe("reported");
  });
  it("calculates free cash flow and labels it", () => {
    const fcf = row(f, "annual", "freeCashFlow")!.values[0]!;
    const ocf = row(f, "annual", "operatingCashFlow")!.values[0]!.value;
    const capex = row(f, "annual", "capex")!.values[0]!.value;
    expect(fcf).toMatchObject({ kind: "calculated", value: ocf - Math.abs(capex) });
    expect(fcf.note).toMatch(/operating cash flow minus capital expenditures/i);
  });
  it("computes key metrics from reported numbers", () => {
    const m = annualKeyMetrics(f)[0];
    expect(m.revenueGrowthPct).toBeCloseTo((478_834 / 416_161 - 1) * 100, 3);
    expect(m.grossMarginPct).toBeGreaterThan(40);
    expect(m.grossMarginPct).toBeLessThan(60);
  });
});

describe("Shopify (Canadian, US GAAP, changes revenue tag over time)", () => {
  const f = build("shop");
  it("has revenue for every year even though the concept changed", () => {
    const rev = row(f, "annual", "revenue")!;
    expect(rev.values.every((v) => v !== null)).toBe(true);
    expect(new Set(rev.values.map((v) => v!.concept)).size).toBeGreaterThanOrEqual(2);
    expect(rev.values[0]!.value).toBe(11_556_000_000);
  });
  it("shows total liabilities as unavailable rather than guessing", () => {
    expect(row(f, "annual", "totalLiabilities")!.values.every((v) => v === null)).toBe(true);
  });
  it("marks years where a later filing changed the number", () => {
    expect(row(f, "annual", "revenue")!.values.some((v) => v!.restated)).toBe(true);
  });
});

describe("Royal Bank of Canada (IFRS, CAD, bank)", () => {
  const f = build("ry");
  it("keeps the reporting currency and standard, with no conversion", () => {
    expect(f.currency).toBe("CAD");
    expect(f.accountingStandard).toBe("ifrs-full");
    const money = f.annual.statements.flatMap((s) => s.rows).filter((r) => r.unitType === "money").flatMap((r) => r.values);
    expect(money.filter(Boolean).every((v) => v!.unit === "CAD")).toBe(true);
    expect(f.notes.join(" ")).toMatch(/Reported in CAD/);
  });
  it("hides rows that do not apply to banks", () => {
    for (const key of ["grossProfit", "operatingIncome", "costOfRevenue", "capex", "freeCashFlow"]) {
      expect(row(f, "annual", key)).toBeUndefined();
    }
    expect(f.company.isFinancial).toBe(true);
    expect(f.notes.join(" ")).toMatch(/Banks and insurers/);
  });
  it("reads quarterly figures from foreign-issuer interim filings", () => {
    const rev = row(f, "quarterly", "revenue")!;
    expect(rev.values.filter(Boolean).length).toBeGreaterThanOrEqual(6);
    expect(rev.values[0]!.form).toBe("6-K");
  });
  it("uses total equity so liabilities are reported, not guessed", () => {
    expect(row(f, "annual", "totalLiabilities")!.values[0]!.value).toBeGreaterThan(2_000_000_000_000);
  });
});

describe("bad input", () => {
  it("throws a typed error for a malformed facts payload", () => {
    expect(() => buildFinancials({}, load("aapl", "submissions"), "x")).toThrowError(/expected shape/);
  });
  it("throws a typed error for a malformed profile", () => {
    expect(() => buildFinancials(load("aapl", "facts"), { nope: 1 }, "x")).toThrowError(/expected shape/);
  });
  it("reports a company with no facts as having no annual data", () => {
    const f = buildFinancials({ cik: 1, entityName: "Empty Co", facts: {} }, load("aapl", "submissions"), "x");
    expect(f.annual.statements[0].columns).toEqual([]);
    expect(f.notes[0]).toMatch(/No annual financial data/);
  });
});
