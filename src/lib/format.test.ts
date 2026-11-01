import { describe, expect, it } from "vitest";
import { formatCompact, formatCurrency, formatDate, formatPercent, UNAVAILABLE } from "./format";

describe("format", () => {
  it("renders missing values as an em dash", () => {
    expect(formatCurrency(null)).toBe(UNAVAILABLE);
    expect(formatPercent(undefined)).toBe(UNAVAILABLE);
    expect(formatCompact(NaN)).toBe(UNAVAILABLE);
    expect(formatDate("not a date")).toBe(UNAVAILABLE);
  });
  it("signs percentages", () => {
    expect(formatPercent(4.2)).toBe("+4.20%");
    expect(formatPercent(-4.2)).toBe("−4.20%");
    expect(formatPercent(0)).toBe("0.00%");
  });
  it("compacts large values", () => expect(formatCompact(1_230_000_000_000)).toBe("1.2T"));
  it("formats dates in UTC", () => expect(formatDate("2025-03-01")).toBe("Mar 1, 2025"));
});
