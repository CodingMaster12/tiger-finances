import { describe, expect, it } from "vitest";
import { MAX_QUERY_LENGTH, runSearch } from "./search-service";

describe("runSearch", () => {
  it("searches the saved company list", () => {
    const r = runSearch("apple");
    expect(r.results[0]).toMatchObject({ cik: "0000320193", name: "Apple Inc." });
    expect(r.query).toBe("apple");
  });
  it("returns nothing for blank input", () => {
    expect(runSearch("").results).toEqual([]);
    expect(runSearch("   ").results).toEqual([]);
  });
  it("trims and cuts the query", () => {
    expect(runSearch("  apple  ").query).toBe("apple");
    expect(runSearch("x".repeat(500)).query).toHaveLength(MAX_QUERY_LENGTH);
  });
  it("respects the limit", () => {
    expect(runSearch("a", 1).results.length).toBeLessThanOrEqual(1);
  });
  it("reports whether the full list is installed", () => {
    expect(typeof runSearch("apple").complete).toBe("boolean");
  });
});
