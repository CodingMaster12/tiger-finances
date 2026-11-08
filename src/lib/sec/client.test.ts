import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { createSecClient, resolveDataOrigin, resolveUserAgent } from "./client";
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
  it("stops quickly after a 403, because that means this address is blocked", async () => {
    const fetchImpl = vi.fn(async () => json("blocked", 403));
    await expect(createSecClient({ ...fast, maxRetries: 3, fetchImpl }).getJson("u")).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("keeps retrying a 429 up to the limit, then reports rate_limited", async () => {
    const fetchImpl = vi.fn(async () => json("slow down", 429));
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

describe("resolveDataOrigin", () => {
  it("defaults to the real SEC data server", () => {
    expect(resolveDataOrigin({})).toBe("https://data.sec.gov");
  });
  it("allows a local fixture server outside production", () => {
    expect(resolveDataOrigin({ SEC_DATA_ORIGIN: "http://localhost:4010", NODE_ENV: "development" })).toBe("http://localhost:4010");
    expect(resolveDataOrigin({ SEC_DATA_ORIGIN: "http://127.0.0.1:4010", NODE_ENV: "test" })).toBe("http://127.0.0.1:4010");
  });
  it("ignores the override in production, so it can never redirect the live site", () => {
    expect(resolveDataOrigin({ SEC_DATA_ORIGIN: "http://localhost:4010", NODE_ENV: "production" })).toBe("https://data.sec.gov");
  });
  it("only accepts a local address, never an arbitrary host", () => {
    expect(resolveDataOrigin({ SEC_DATA_ORIGIN: "https://evil.example.com", NODE_ENV: "development" })).toBe("https://data.sec.gov");
    expect(resolveDataOrigin({ SEC_DATA_ORIGIN: "http://localhost.evil.com", NODE_ENV: "development" })).toBe("https://data.sec.gov");
  });
});
