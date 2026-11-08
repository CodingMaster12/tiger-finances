import { describe, expect, it, vi } from "vitest";
import { createLoaderCache } from "./cache";

describe("createLoaderCache", () => {
  it("serves a fresh value without calling the loader again", async () => {
    let t = 0;
    const c = createLoaderCache<number>({ ttlMs: 100, now: () => t });
    const loader = vi.fn(async () => 1);
    await c.get("k", loader);
    t = 50;
    expect(await c.get("k", loader)).toMatchObject({ value: 1, stale: false });
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it("reloads after the time-to-live", async () => {
    let t = 0;
    const c = createLoaderCache<number>({ ttlMs: 100, now: () => t });
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await c.get("k", loader);
    t = 150;
    expect((await c.get("k", loader)).value).toBe(2);
  });
  it("shares one in-flight request between concurrent callers", async () => {
    const c = createLoaderCache<number>({ ttlMs: 100 });
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 7;
    });
    const [a, b] = await Promise.all([c.get("k", loader), c.get("k", loader)]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect([a.value, b.value]).toEqual([7, 7]);
  });
  it("returns the old copy, marked stale, when a refresh fails", async () => {
    let t = 0;
    const c = createLoaderCache<number>({ ttlMs: 100, now: () => t });
    await c.get("k", async () => 1);
    t = 500;
    expect(await c.get("k", async () => Promise.reject(new Error("down")))).toMatchObject({ value: 1, stale: true });
  });
  it("throws when the first load fails and nothing is cached", async () => {
    const c = createLoaderCache<number>({ ttlMs: 100 });
    await expect(c.get("k", async () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect(c.size()).toBe(0);
  });
  it("does not cache a failure, so the next call retries", async () => {
    const c = createLoaderCache<number>({ ttlMs: 100 });
    await c.get("k", async () => Promise.reject(new Error("x"))).catch(() => undefined);
    expect((await c.get("k", async () => 3)).value).toBe(3);
  });
  it("evicts the oldest entry beyond the size limit", async () => {
    const c = createLoaderCache<number>({ ttlMs: 1000, maxEntries: 2 });
    for (const k of ["a", "b", "c"]) await c.get(k, async () => 1);
    expect(c.size()).toBe(2);
  });
});
