import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./normalize-url";

describe("normalizeSiteUrl", () => {
  it("keeps a proper https origin", () => expect(normalizeSiteUrl("https://app.vercel.app")).toBe("https://app.vercel.app"));
  it("adds https when the scheme is missing", () => expect(normalizeSiteUrl("app.vercel.app")).toBe("https://app.vercel.app"));
  it("strips trailing slashes and paths", () => expect(normalizeSiteUrl("https://app.vercel.app/")).toBe("https://app.vercel.app"));
  it("uses http for localhost", () => expect(normalizeSiteUrl("localhost:3000")).toBe("http://localhost:3000"));
  it("trims whitespace", () => expect(normalizeSiteUrl("  https://a.co  ")).toBe("https://a.co"));
  it("returns null for empty or invalid", () => {
    expect(normalizeSiteUrl("")).toBeNull();
    expect(normalizeSiteUrl(undefined)).toBeNull();
    expect(normalizeSiteUrl("http://")).toBeNull();
  });
});
