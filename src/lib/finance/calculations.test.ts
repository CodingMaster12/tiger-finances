import { describe, expect, it } from "vitest";
import {
  freeCashFlow,
  growthPercent,
  marginPercent,
  priceReturnPercent,
  priceToEarnings,
  ratio,
  rebaseToPercent,
} from "./calculations";

describe("growthPercent", () => {
  it("computes growth", () => expect(growthPercent(110, 100)).toBeCloseTo(10));
  it("computes decline", () => expect(growthPercent(80, 100)).toBeCloseTo(-20));
  it("is undefined for zero or negative prior", () => {
    expect(growthPercent(10, 0)).toBeNull();
    expect(growthPercent(10, -5)).toBeNull();
  });
  it("is undefined for missing input", () => {
    expect(growthPercent(null, 5)).toBeNull();
    expect(growthPercent(5, undefined)).toBeNull();
    expect(growthPercent(NaN, 5)).toBeNull();
  });
});

describe("marginPercent", () => {
  it("computes net margin", () => expect(marginPercent(25, 200)).toBeCloseTo(12.5));
  it("allows negative margins", () => expect(marginPercent(-20, 200)).toBeCloseTo(-10));
  it("is undefined for zero revenue", () => expect(marginPercent(5, 0)).toBeNull());
});

describe("freeCashFlow", () => {
  it("subtracts a negative-signed capex", () => expect(freeCashFlow(100, -30)).toBe(70));
  it("subtracts a positive-signed capex", () => expect(freeCashFlow(100, 30)).toBe(70));
  it("is undefined if an input is missing", () => expect(freeCashFlow(100, null)).toBeNull());
});

describe("priceToEarnings", () => {
  it("computes P/E", () => expect(priceToEarnings(150, 5)).toBe(30));
  it("is undefined for zero or negative EPS", () => {
    expect(priceToEarnings(150, 0)).toBeNull();
    expect(priceToEarnings(150, -2)).toBeNull();
  });
});

describe("ratio", () => {
  it("computes", () => expect(ratio(10, 4)).toBe(2.5));
  it("is undefined for non-positive denominator", () => expect(ratio(10, -1)).toBeNull());
});

describe("price return", () => {
  it("computes over a series", () => expect(priceReturnPercent([50, 60, 75])).toBeCloseTo(50));
  it("needs two observations", () => expect(priceReturnPercent([50])).toBeNull());
  it("rebases to zero at the start", () => {
    const r = rebaseToPercent([100, 110, 90]);
    expect(r[0]).toBe(0);
    expect(r[1]).toBeCloseTo(10);
    expect(r[2]).toBeCloseTo(-10);
  });
  it("rebase is undefined for a non-positive base", () => {
    expect(rebaseToPercent([0, 1])).toEqual([null, null]);
  });
});
