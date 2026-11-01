import { describe, expect, it } from "vitest";
import { weakPasswordMessage } from "./weak-password";

describe("weakPasswordMessage", () => {
  it("explains a breached password", () => expect(weakPasswordMessage({ reasons: ["pwned"] })).toMatch(/data breach/));
  it("explains character requirements", () => expect(weakPasswordMessage({ reasons: ["characters"] })).toMatch(/character types/));
  it("combines reasons", () => expect(weakPasswordMessage({ reasons: ["length", "pwned"] })).toMatch(/breach.*longer/));
  it("falls back when no reason is given", () => expect(weakPasswordMessage(new Error("x"))).toMatch(/rejected/));
});
