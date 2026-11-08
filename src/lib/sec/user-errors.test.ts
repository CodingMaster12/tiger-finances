import { describe, expect, it } from "vitest";
import { describeSecError } from "./user-errors";
import { SecError, type SecErrorCode } from "./types";

describe("describeSecError", () => {
  const codes: SecErrorCode[] = ["config", "not_found", "not_covered", "rate_limited", "upstream", "invalid_data"];
  it("gives every error code a plain title and message", () => {
    for (const code of codes) {
      const e = describeSecError(new SecError(code, "internal detail"));
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.message.length).toBeGreaterThan(10);
    }
  });
  it("never leaks internal details, variable names or URLs to visitors", () => {
    for (const code of codes) {
      const e = describeSecError(new SecError(code, "SEC_USER_AGENT is not set at https://data.sec.gov/x"));
      expect(`${e.title} ${e.message}`).not.toMatch(/SEC_USER_AGENT|https?:|data\.sec\.gov|env/i);
    }
  });
  it("only allows a saved-copy fallback for temporary failures, not for 'no such data'", () => {
    expect(describeSecError(new SecError("rate_limited", "")).canFallBack).toBe(true);
    expect(describeSecError(new SecError("config", "")).canFallBack).toBe(true);
    expect(describeSecError(new SecError("upstream", "")).canFallBack).toBe(true);
    expect(describeSecError(new SecError("not_covered", "")).canFallBack).toBe(false);
    expect(describeSecError(new SecError("invalid_data", "")).canFallBack).toBe(false);
  });
  it("handles unknown errors", () => {
    const e = describeSecError(new Error("boom"));
    expect(e.title).toMatch(/Could not load/);
    expect(e.message).not.toMatch(/boom/);
  });
});
