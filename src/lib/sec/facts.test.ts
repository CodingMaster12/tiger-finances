import { describe, expect, it } from "vitest";
import { METRICS } from "./concepts";
import { addDays, clusterDates, daysBetween, flowYears, indexFacts, instantMap, instantNear, type Candidate } from "./facts";
import { SecError } from "./types";

interface Spec {
  start?: string;
  end: string;
  val: number;
  form?: string;
  filed?: string;
  accn?: string;
  priority?: number;
  concept?: string;
}
const cand = (o: Spec): Candidate => ({
  row: { start: o.start, end: o.end, val: o.val, form: o.form ?? "10-Q", filed: o.filed ?? o.end, accn: o.accn ?? `acc-${o.end}-${o.val}` },
  unit: "USD",
  concept: o.concept ?? "us-gaap:Revenues",
  priority: o.priority ?? 0,
  total: false,
});

// A calendar-year company: Q1 10, Q2 15, Q3 20, Q4 25 => FY 70
const calendarYear = (): Candidate[] => [
  cand({ start: "2023-01-01", end: "2023-03-31", val: 10 }),
  cand({ start: "2023-01-01", end: "2023-06-30", val: 25 }),
  cand({ start: "2023-01-01", end: "2023-09-30", val: 45 }),
  cand({ start: "2023-01-01", end: "2023-12-31", val: 70, form: "10-K", filed: "2024-02-01" }),
];

describe("helpers", () => {
  it("daysBetween and addDays", () => {
    expect(daysBetween("2023-01-01", "2023-01-31")).toBe(30);
    expect(addDays("2023-12-31", 1)).toBe("2024-01-01");
  });
  it("clusterDates merges dates within the gap and keeps the latest", () => {
    expect(clusterDates(["2023-12-30", "2023-12-31", "2024-12-31", "2024-12-28"])).toEqual(["2023-12-31", "2024-12-31"]);
    expect(clusterDates([])).toEqual([]);
  });
});

describe("flowYears: annual", () => {
  it("keeps the most recently filed value and flags a restatement", () => {
    const [y] = flowYears(
      [
        cand({ start: "2022-01-01", end: "2022-12-31", val: 100, form: "10-K", filed: "2023-02-01" }),
        cand({ start: "2022-01-01", end: "2022-12-31", val: 90, form: "10-K", filed: "2024-02-01" }),
      ],
      true,
    );
    expect(y.annual?.value).toBe(90);
    expect(y.annual?.restated).toBe(true);
  });
  it("does not flag a restatement when later filings repeat the same value", () => {
    const [y] = flowYears(
      [
        cand({ start: "2022-01-01", end: "2022-12-31", val: 100, form: "10-K", filed: "2023-02-01" }),
        cand({ start: "2022-01-01", end: "2022-12-31", val: 100, form: "10-K", filed: "2024-02-01" }),
      ],
      true,
    );
    expect(y.annual?.restated).toBeUndefined();
  });
  it("ignores 12-month rows from quarterly forms and rows of other lengths", () => {
    const years = flowYears(
      [
        cand({ start: "2022-01-01", end: "2022-12-31", val: 1, form: "10-Q" }),
        cand({ start: "2022-01-01", end: "2022-12-31", val: 2, form: "6-K" }),
        cand({ start: "2022-01-01", end: "2022-10-31", val: 3, form: "10-K" }),
      ],
      true,
    );
    expect(years).toHaveLength(0);
  });
  it("applies concept priority per period, not per company", () => {
    const years = flowYears(
      [
        cand({ start: "2019-01-01", end: "2019-12-31", val: 5, form: "10-K", priority: 1, concept: "us-gaap:Old" }),
        cand({ start: "2020-01-01", end: "2020-12-31", val: 6, form: "10-K", priority: 1, concept: "us-gaap:Old" }),
        cand({ start: "2020-01-01", end: "2020-12-31", val: 7, form: "10-K", priority: 0, concept: "us-gaap:New" }),
      ],
      true,
    );
    expect(years.map((y) => [y.annual?.value, y.annual?.concept])).toEqual([
      [5, "us-gaap:Old"],
      [7, "us-gaap:New"],
    ]);
  });
  it("accepts 52/53-week years", () => {
    const [y] = flowYears(
      [
        cand({ start: "2023-10-01", end: "2024-09-28", val: 400, form: "10-K" }),
        cand({ start: "2023-10-01", end: "2023-12-30", val: 120 }),
      ],
      true,
    );
    expect(y.annual?.value).toBe(400);
    expect(y.quarters.get(1)?.value).toBe(120);
  });
});

describe("flowYears: quarters", () => {
  it("derives Q2, Q3 and Q4 from year-to-date totals and labels them calculated", () => {
    const [y] = flowYears(calendarYear(), true);
    expect(y.quarters.get(1)).toMatchObject({ value: 10, kind: "reported" });
    expect(y.quarters.get(2)).toMatchObject({ value: 15, kind: "calculated", periodStart: "2023-04-01", periodEnd: "2023-06-30" });
    expect(y.quarters.get(3)).toMatchObject({ value: 20, kind: "calculated", periodStart: "2023-07-01", periodEnd: "2023-09-30" });
    expect(y.quarters.get(4)).toMatchObject({ value: 25, kind: "calculated", periodStart: "2023-10-01", periodEnd: "2023-12-31" });
    expect(y.quarters.get(4)?.note).toMatch(/9-month/);
  });
  it("prefers a directly reported quarter over a derived one", () => {
    const rows = [...calendarYear(), cand({ start: "2023-04-01", end: "2023-06-30", val: 16 })];
    const [y] = flowYears(rows, true);
    expect(y.quarters.get(2)).toMatchObject({ value: 16, kind: "reported" });
  });
  it("leaves a quarter empty when an ingredient is missing, never guesses", () => {
    const rows = calendarYear().filter((r) => r.row.end !== "2023-09-30");
    const [y] = flowYears(rows, true);
    expect(y.quarters.has(3)).toBe(false);
    expect(y.quarters.has(4)).toBe(false);
    expect(y.quarters.get(2)?.value).toBe(15);
  });
  it("never derives per-share values by subtraction", () => {
    const [y] = flowYears(calendarYear(), false);
    expect([...y.quarters.keys()]).toEqual([1]);
  });
  it("includes the fiscal year in progress, with no end date yet", () => {
    const years = flowYears([...calendarYear(), cand({ start: "2024-01-01", end: "2024-03-31", val: 11 })], true);
    expect(years).toHaveLength(2);
    expect(years[1]).toMatchObject({ fyStart: "2024-01-01", fyEnd: null, annual: null });
    expect(years[1].quarters.get(1)?.value).toBe(11);
  });
});

describe("instants", () => {
  const map = instantMap([
    cand({ end: "2023-12-31", val: 1, filed: "2024-02-01" }),
    cand({ end: "2023-12-31", val: 2, filed: "2024-05-01" }),
    cand({ end: "2024-09-28", val: 3 }),
    cand({ start: "2023-01-01", end: "2023-12-31", val: 99 }), // a flow row, ignored
  ]);
  it("takes the latest filed value for a date and flags the change", () => {
    expect(instantNear(map, "2023-12-31")).toMatchObject({ value: 2, restated: true });
  });
  it("allows a few days of slack and no more", () => {
    expect(instantNear(map, "2024-09-30")?.value).toBe(3);
    expect(instantNear(map, "2024-10-20")).toBeNull();
  });
});

describe("indexFacts", () => {
  const revenue = METRICS.find((m) => m.key === "revenue")!;
  const payload = (rows: unknown[], extraUnits: Record<string, unknown[]> = {}) => ({
    cik: 1,
    entityName: "X",
    facts: { "us-gaap": { Revenues: { units: { USD: rows, ...extraUnits } } } },
  });
  const good = { start: "2023-01-01", end: "2023-12-31", val: 5, accn: "a", form: "10-K", filed: "2024-01-01" };

  it("rejects a payload with the wrong shape", () => {
    expect(() => indexFacts({ nope: true })).toThrow(SecError);
    try {
      indexFacts("text");
    } catch (e) {
      expect((e as SecError).code).toBe("invalid_data");
    }
  });
  it("drops malformed rows and counts them", () => {
    const idx = indexFacts(payload([good, { ...good, val: "5" }, { ...good, end: "not a date" }]));
    expect(idx.candidates(revenue)).toHaveLength(1);
    expect(idx.droppedRows()).toBe(2);
  });
  it("only reads units of the right kind", () => {
    const idx = indexFacts(payload([good], { "USD/shares": [good], shares: [good] }));
    expect(idx.candidates(revenue).map((c) => c.unit)).toEqual(["USD"]);
  });
  it("returns nothing for concepts the company does not use", () => {
    const idx = indexFacts({ cik: 1, entityName: "X", facts: {} });
    expect(idx.candidates(revenue)).toEqual([]);
  });
});
