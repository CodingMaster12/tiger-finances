import { describe, expect, it } from "vitest";
import { MAX_QUERY_LENGTH, runSearch } from "./search-service";

describe("runSearch", () => {
  it("searches the company list", async () => {
    const r = await runSearch("apple");
    expect(r.results[0]).toMatchObject({ cik: "0000320193", name: "Apple Inc." });
    expect(r.query).toBe("apple");
  });
  it("returns nothing for blank input", async () => {
    expect((await runSearch("")).results).toEqual([]);
    expect((await runSearch("   ")).results).toEqual([]);
  });
  it("trims and cuts the query", async () => {
    expect((await runSearch("  apple  ")).query).toBe("apple");
    expect((await runSearch("x".repeat(500))).query).toHaveLength(MAX_QUERY_LENGTH);
  });
  it("respects the limit", async () => {
    expect((await runSearch("a", 1)).results.length).toBeLessThanOrEqual(1);
  });
  it("reports whether the full list is available (false in tests: starter list)", async () => {
    expect((await runSearch("apple")).complete).toBe(false);
  });
});
