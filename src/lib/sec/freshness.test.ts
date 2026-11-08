import { describe, expect, it } from "vitest";
import { daysSince } from "./freshness";

const NOW = Date.parse("2026-11-09T12:00:00Z");
describe("daysSince", () => {
  it("counts whole days", () => {
    expect(daysSince("2026-11-09T00:00:00Z", NOW)).toBe(0);
    expect(daysSince("2026-11-08T00:00:00Z", NOW)).toBe(1);
    expect(daysSince("2026-09-25T12:00:00Z", NOW)).toBe(45);
  });
  it("never goes negative and tolerates bad input", () => {
    expect(daysSince("2027-01-01T00:00:00Z", NOW)).toBe(0);
    expect(daysSince(null, NOW)).toBe(0);
    expect(daysSince("not a date", NOW)).toBe(0);
  });
});
