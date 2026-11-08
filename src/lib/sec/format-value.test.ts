import { describe, expect, it } from "vitest";
import { formatValue } from "./format-value";
import type { SlimPoint } from "./slim";

const pt = (v: number, unit = "USD"): SlimPoint => ({ v, unit, calc: false, restated: false, tip: "" });

describe("formatValue (deterministic, no Intl)", () => {
  it("compacts money into T, B, M and K with at most two decimals", () => {
    expect(formatValue(pt(478_834_000_000), "money")).toBe("$478.83B");
    expect(formatValue(pt(2_325_006_000_000), "money")).toBe("$2.33T");
    expect(formatValue(pt(7_060_000_000), "money")).toBe("$7.06B");
    expect(formatValue(pt(97_000_000_000), "money")).toBe("$97B");
    expect(formatValue(pt(450_000), "money")).toBe("$450K");
    expect(formatValue(pt(12), "money")).toBe("$12");
  });
  it("uses a proper minus sign for negatives", () => {
    expect(formatValue(pt(-1_420_000_000), "money")).toBe("−$1.42B");
  });
  it("prints non-USD currencies by code so CAD is never mistaken for USD", () => {
    expect(formatValue(pt(66_605_000_000, "CAD"), "money")).toBe("CAD 66.61B");
  });
  it("prints per-share values with two decimals", () => {
    expect(formatValue(pt(8.98, "USD/shares"), "perShare")).toBe("$8.98");
    expect(formatValue(pt(14.07, "CAD/shares"), "perShare")).toBe("CAD 14.07");
    expect(formatValue(pt(-0.45, "USD/shares"), "perShare")).toBe("−$0.45");
  });
  it("prints share counts without a currency", () => {
    expect(formatValue(pt(15_500_000_000, "shares"), "shares")).toBe("15.5B");
  });
  it("gives identical output every time (safe for server and browser)", () => {
    expect(formatValue(pt(1234567.891), "money")).toBe(formatValue(pt(1234567.891), "money"));
  });
});
