import { describe, expect, it } from "vitest";
import { nextUsernameChange } from "./username";

const now = Date.parse("2026-11-01T00:00:00Z");
describe("nextUsernameChange", () => {
  it("is free before the first rename", () => expect(nextUsernameChange(null, now)).toBeNull());
  it("blocks within 14 days", () => expect(nextUsernameChange("2026-10-25T00:00:00Z", now)).toBe("2026-11-08T00:00:00.000Z"));
  it("allows after 14 days", () => expect(nextUsernameChange("2026-10-10T00:00:00Z", now)).toBeNull());
  it("ignores invalid dates", () => expect(nextUsernameChange("garbage", now)).toBeNull());
});
