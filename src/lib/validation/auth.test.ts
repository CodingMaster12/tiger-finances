import { describe, expect, it } from "vitest";
import { changePasswordSchema, fieldErrorsFrom, loginSchema, profileSchema, registerSchema, safeNextPath } from "./auth";

const valid = { email: " Me@Example.COM ", username: "tiger_1", password: "correct horse 9", confirmPassword: "correct horse 9" };

describe("registerSchema", () => {
  it("accepts valid input and normalizes email", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("me@example.com");
  });
  it.each([
    ["short password", { password: "abc1", confirmPassword: "abc1" }, "password"],
    ["no number", { password: "abcdefghijkl", confirmPassword: "abcdefghijkl" }, "password"],
    ["no letter", { password: "1234567890123", confirmPassword: "1234567890123" }, "password"],
    ["over 72 bytes", { password: "a1".repeat(40), confirmPassword: "a1".repeat(40) }, "password"],
    ["mismatch", { confirmPassword: "different 123456" }, "confirmPassword"],
    ["bad email", { email: "nope" }, "email"],
    ["short username", { username: "ab" }, "username"],
    ["username with space", { username: "a b c" }, "username"],
    ["username too long", { username: "a".repeat(21) }, "username"],
  ])("rejects %s", (_n, patch, field) => {
    const r = registerSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error)[field]).toBeTruthy();
  });
});

describe("other schemas", () => {
  it("login requires a password", () => expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false));
  it("blank display name becomes null", () => {
    const r = profileSchema.parse({ username: "abc", displayName: "  " });
    expect(r.displayName).toBeNull();
  });
  it("change password requires matching confirmation", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", password: "valid pass 12", confirmPassword: "other" }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => expect(safeNextPath("/account?tab=security")).toBe("/account?tab=security"));
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined, "/a\nb"])(
    "rejects %s",
    (v) => expect(safeNextPath(v as string | null | undefined)).toBe("/account"),
  );
});
