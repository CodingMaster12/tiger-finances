import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import type { SecClient } from "./client";
import { createFinancialsService } from "./service";
import { SecError } from "./types";

const load = (n: string, k: string): unknown => JSON.parse(readFileSync(`src/lib/sec/__fixtures__/${n}.${k}.json`, "utf8"));
const calls: string[] = [];
const okClient = (): SecClient => ({
  getJson: async (url: string) => {
    calls.push(url);
    return url.includes("/submissions/") ? load("aapl", "submissions") : load("aapl", "facts");
  },
});

describe("financials service", () => {
  beforeEach(() => {
    calls.length = 0;
  });
  it("fetches the profile and facts for a zero-padded CIK, then serves the cache", async () => {
    const client = okClient();
    const svc = createFinancialsService(client);
    const first = await svc.getCompanyFinancials("320193");
    expect(first.stale).toBe(false);
    expect(first.data.company.name).toBe("Apple Inc.");
    expect(calls).toEqual([
      "https://data.sec.gov/submissions/CIK0000320193.json",
      "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json",
    ]);
    await svc.getCompanyFinancials(320193);
    expect(calls).toHaveLength(2);
  });
  it("stamps the retrieval time", async () => {
    const svc = createFinancialsService(okClient(), () => Date.parse("2026-11-08T12:00:00Z"));
    expect((await svc.getCompanyFinancials("320193")).data.source.retrievedAt).toBe("2026-11-08T12:00:00.000Z");
  });
  it("rejects anything that is not a CIK before touching the network", async () => {
    const client = okClient();
    for (const bad of ["", "abc", "12345678901", "../etc"]) {
      await expect(createFinancialsService(client).getCompanyFinancials(bad)).rejects.toMatchObject({ code: "not_found" });
    }
    expect(calls).toHaveLength(0);
  });
  it("says a company is not covered when the SEC has no structured financial data for it", async () => {
    const client = {
      getJson: vi.fn(async (url: string) => {
        if (url.includes("/submissions/")) return load("aapl", "submissions");
        throw new SecError("not_found", "404");
      }),
    };
    await expect(createFinancialsService(client).getCompanyFinancials("320193")).rejects.toMatchObject({ code: "not_covered" });
  });
  it("shows the older copy, marked stale, when the SEC fails after the cache expires", async () => {
    let t = 0;
    let down = false;
    const client = {
      getJson: vi.fn(async (url: string) => {
        if (down) throw new SecError("rate_limited", "blocked");
        return url.includes("/submissions/") ? load("aapl", "submissions") : load("aapl", "facts");
      }),
    };
    const svc = createFinancialsService(client, () => t);
    await svc.getCompanyFinancials("320193");
    t = 13 * 60 * 60 * 1000;
    down = true;
    const r = await svc.getCompanyFinancials("320193");
    expect(r.stale).toBe(true);
    expect(r.data.company.name).toBe("Apple Inc.");
  });
  it("passes through a rate-limit error when nothing is cached", async () => {
    const client = { getJson: vi.fn(async () => Promise.reject(new SecError("rate_limited", "blocked"))) };
    await expect(createFinancialsService(client).getCompanyFinancials("320193")).rejects.toMatchObject({ code: "rate_limited" });
  });
});
