import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { lookupCompany, type LookupDeps } from "./lookup";
import { buildFinancials } from "./statements";
import { SecError } from "./types";

const load = (n: string, k: string): unknown => JSON.parse(readFileSync(`src/lib/sec/__fixtures__/${n}.${k}.json`, "utf8"));
const apple = buildFinancials(load("aapl", "facts"), load("aapl", "submissions"), "2026-11-09T00:00:00.000Z");
const CIK = "0000320193";

const deps = (over: Partial<LookupDeps> = {}): LookupDeps => ({
  readStored: vi.fn(async () => null),
  live: vi.fn(async () => Promise.reject(new SecError("rate_limited", "blocked"))),
  saved: vi.fn(() => null),
  companyName: vi.fn(async () => null),
  queue: vi.fn(async () => "queued" as const),
  ...over,
});

describe("lookupCompany", () => {
  it("prefers the database and does not touch the SEC", async () => {
    const d = deps({ readStored: vi.fn(async () => ({ financials: apple, retrievedAt: "2026-11-09T01:00:00Z", updatedAt: "x" })) });
    const r = await lookupCompany(CIK, d);
    expect(r).toMatchObject({ kind: "ok", origin: "database", retrievedAt: "2026-11-09T01:00:00Z" });
    expect(d.live).not.toHaveBeenCalled();
  });
  it("falls back to the live SEC when the database has nothing", async () => {
    const r = await lookupCompany(CIK, deps({ live: vi.fn(async () => apple) }));
    expect(r).toMatchObject({ kind: "ok", origin: "live", retrievedAt: apple.source.retrievedAt });
  });
  it("survives a database failure and carries on", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await lookupCompany(CIK, deps({ readStored: vi.fn(async () => Promise.reject(new Error("db down"))), live: vi.fn(async () => apple) }));
    expect(r).toMatchObject({ kind: "ok", origin: "live" });
    spy.mockRestore();
  });
  it("says not found when the SEC says there is no such company", async () => {
    const r = await lookupCompany(CIK, deps({ live: vi.fn(async () => Promise.reject(new SecError("not_found", "x"))) }));
    expect(r).toEqual({ kind: "not_found" });
  });
  it("reports 'no financial data' without queueing or falling back", async () => {
    const d = deps({ live: vi.fn(async () => Promise.reject(new SecError("not_covered", "x"))), saved: vi.fn(() => apple), companyName: vi.fn(async () => "Co") });
    const r = await lookupCompany(CIK, d);
    expect(r).toMatchObject({ kind: "error", title: expect.stringMatching(/No financial statements/) });
    expect(d.queue).not.toHaveBeenCalled();
  });
  it("uses the saved copy when the SEC is blocked and a copy exists", async () => {
    const r = await lookupCompany(CIK, deps({ saved: vi.fn(() => apple) }));
    expect(r).toMatchObject({ kind: "ok", origin: "saved", retrievedAt: null });
  });
  it("queues a real SEC company that is not saved yet", async () => {
    const d = deps({ companyName: vi.fn(async () => "Microsoft Corp") });
    const r = await lookupCompany("0000789019", d);
    expect(r).toEqual({ kind: "queued", name: "Microsoft Corp" });
    expect(d.queue).toHaveBeenCalledWith("0000789019");
  });
  it("does not queue a number that is not on the SEC company list", async () => {
    const d = deps();
    const r = await lookupCompany("0000999999", d);
    expect(r).toMatchObject({ kind: "error", title: "The SEC is busy right now" });
    expect(d.queue).not.toHaveBeenCalled();
  });
  it("tells the visitor when the queue is full, and when queueing fails", async () => {
    const full = await lookupCompany(CIK, deps({ companyName: vi.fn(async () => "Co"), queue: vi.fn(async () => "full" as const) }));
    expect(full).toMatchObject({ kind: "error", title: expect.stringMatching(/not adding new companies/) });
    const failed = await lookupCompany(CIK, deps({ companyName: vi.fn(async () => "Co"), queue: vi.fn(async () => "failed" as const) }));
    expect(failed).toMatchObject({ kind: "error" });
    expect((failed as { kind: "error"; title: string }).title).not.toMatch(/Adding/);
  });
  it("treats a company-list failure as 'unknown company' rather than crashing", async () => {
    const r = await lookupCompany(CIK, deps({ companyName: vi.fn(async () => Promise.reject(new Error("x"))) }));
    expect(r.kind).toBe("error");
  });
});
