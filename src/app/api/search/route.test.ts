import { describe, expect, it } from "vitest";
import { GET } from "./route";

const call = (qs: string) => GET(new Request(`http://localhost/api/search${qs}`));

describe("GET /api/search", () => {
  it("finds a company in the saved list and says whether the list is complete", async () => {
    const res = await call("?q=apple");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ cik: "0000320193", name: "Apple Inc." });
    expect(typeof body.complete).toBe("boolean");
    expect(res.headers.get("cache-control")).toMatch(/max-age/);
  });
  it("returns an empty list for a missing or blank query", async () => {
    expect((await (await call("")).json()).results).toEqual([]);
    expect((await (await call("?q=%20%20")).json()).results).toEqual([]);
  });
  it("cuts very long queries instead of failing", async () => {
    const res = await call(`?q=${"a".repeat(500)}`);
    expect(res.status).toBe(200);
    expect((await res.json()).query.length).toBe(80);
  });
  it("rejects a bad limit", async () => {
    expect((await call("?q=apple&limit=999")).status).toBe(400);
    expect((await call("?q=apple&limit=abc")).status).toBe(400);
  });
  it("understands a Canadian listing symbol", async () => {
    const body = await (await call("?q=SHOP.TO")).json();
    expect(body.results[0].cik).toBe("0001594805");
    expect(body.results[0].note).toMatch(/Canadian listing/);
  });
});
