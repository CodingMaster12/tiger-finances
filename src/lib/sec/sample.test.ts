import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getSampleCompanies, getSavedFinancials } from "./sample";

describe("saved sample companies", () => {
  it("looks up saved financials by CIK, padded or not", () => {
    expect(getSavedFinancials("0000320193")?.company.name).toBe("Apple Inc.");
    expect(getSavedFinancials("320193")?.company.name).toBe("Apple Inc.");
    expect(getSavedFinancials("1000275")?.currency).toBe("CAD");
  });
  it("returns null for companies with no saved copy", () => {
    expect(getSavedFinancials("999")).toBeNull();
    expect(getSavedFinancials("0000000001")).toBeNull();
  });
  it("labels saved copies as such", () => {
    expect(getSavedFinancials("320193")?.source.retrievedAt).toBe("saved copy");
  });
  it("builds the three Numbers-page companies with title-cased names", () => {
    expect(getSampleCompanies().map((c) => c.name)).toEqual(["Apple Inc.", "Shopify Inc.", "Royal Bank of Canada"]);
  });
});
