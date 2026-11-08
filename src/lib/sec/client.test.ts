import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { createSecClient, resolveUserAgent } from "./client";
import { SecError } from "./types";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
const fast = { userAgent: "Test test@example.com", minIntervalMs: 0, baseBackoffMs: 1, random: () => 0 };

describe("resolveUserAgent", () => {
  it("returns a configured agent that includes a contact", () => {
    expect(resolveUserAgent({ SEC_USER_AGENT: "Tiger Finances me@example.com" })).toBe("Tiger Finances me@example.com");
    expect(resolveUserAgent({ SEC_USER_AGENT: "Tiger https://example.com" })).toContain("https://example.com");
  });
  it("rejects an agent with no contact", () => {
    expect(() => resolveUserAgent({ SEC_USER_AGENT: "Tiger Finances" })).toThrowError(SecError);
  });
  it("fails closed in production when unset, but works in development", () => {
    expect(() => resolveUserAgent({ NODE_ENV: "production" })).toThrowError(/SEC_USER_AGENT/);
    expect(resolveUserAgent({ NODE_ENV: "development" })).toMatch(/TigerFinances-dev/);
  });
});

describe("createSecClient", () => {
  it("sends the declared User-Agent and returns parsed JSON", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: 1 }));
    const out = await createSecClient({ ...fast, fetchImpl }).getJson("https://data.sec.gov/x");
    expect(out).toEqual({ ok: 1 });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("Test test@example.com");
  });
  it("does not retry a 404", async () => {
    const fetchImpl = vi.fn(async () => json("nope", 404));
    await expect(createSecClient({ ...fast, fetchImpl }).getJson("u")).rejects.toMatchObject({ code: "not_found" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("retries server errors and then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json("x", 503)).mockResolvedValueOnce(json({ a: 1 }));
    expect(await createSecClient({ ...fast, fetchImpl }).getJson("u")).toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("retries a network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(json({ a: 2 }));
    expect(await createSecClient({ ...fast, fetchImpl }).getJson("u")).toEqual({ a: 2 });
  });
  it("gives up with rate_limited after repeated 403/429 answers", async () => {
    const fetchImpl = vi.fn(async () => json("blocked", 403));
    await expect(createSecClient({ ...fast, maxRetries: 2, fetchImpl }).getJson("u")).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it("reports an upstream error for unexpected statuses without retrying", async () => {
    const fetchImpl = vi.fn(async () => json("teapot", 418));
    await expect(createSecClient({ ...fast, fetchImpl }).getJson("u")).rejects.toMatchObject({ code: "upstream" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("reports invalid_data when the body is not JSON", async () => {
    const fetchImpl = vi.fn(async () => json("<html>", 200));
    await expect(createSecClient({ ...fast, fetchImpl }).getJson("u")).rejects.toMatchObject({ code: "invalid_data" });
  });
  it("spaces concurrent requests apart so the SEC limit is never approached", async () => {
    const times: number[] = [];
    const fetchImpl = vi.fn(async () => {
      times.push(performance.now());
      return json({});
    });
    const client = createSecClient({ ...fast, minIntervalMs: 40, fetchImpl });
    await Promise.all([client.getJson("a"), client.getJson("b"), client.getJson("c")]);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(35);
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(35);
  });
});
