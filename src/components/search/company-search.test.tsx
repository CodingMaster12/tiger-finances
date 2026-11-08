import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CompanySearch } from "./company-search";

const response = (results: unknown[], ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ query: "x", complete: true, results }) } as Response);
const apple = { cik: "0000320193", name: "Apple Inc.", tickers: [{ ticker: "AAPL", exchange: "Nasdaq" }] };
const shop = { cik: "0001594805", name: "SHOPIFY INC.", tickers: [{ ticker: "SHOP", exchange: "Nasdaq" }], note: "Canadian listing symbol." };

beforeEach(() => push.mockClear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (value: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value } });

describe("CompanySearch", () => {
  it("is a labelled search combobox and starts closed", () => {
    render(<CompanySearch debounceMs={0} />);
    const box = screen.getByRole("combobox", { name: /search companies/i });
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/search");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows results from the API for what was typed", async () => {
    const fetchMock = vi.fn(() => response([apple, shop]));
    vi.stubGlobal("fetch", fetchMock);
    render(<CompanySearch debounceMs={0} />);
    type("a");
    expect(await screen.findByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByText("Canadian listing symbol.")).toBeInTheDocument();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/search?q=a&limit=8");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("moves with the arrow keys and opens the chosen company on Enter", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([apple, shop])));
    render(<CompanySearch debounceMs={0} />);
    type("a");
    await screen.findByText("Apple Inc.");
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(box.getAttribute("aria-activedescendant")).toBe(options[1].id);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/company/0001594805");
  });

  it("wraps around with ArrowUp from nothing selected", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([apple, shop])));
    render(<CompanySearch debounceMs={0} />);
    type("a");
    await screen.findByText("Apple Inc.");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("opens a company when a result is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([apple])));
    render(<CompanySearch debounceMs={0} />);
    type("app");
    fireEvent.click(await screen.findByText("Apple Inc."));
    expect(push).toHaveBeenCalledWith("/company/0000320193");
  });

  it("closes on Escape", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([apple])));
    render(<CompanySearch debounceMs={0} />);
    type("app");
    await screen.findByText("Apple Inc.");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("explains when nothing matches, including the Canada limit", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([])));
    render(<CompanySearch debounceMs={0} />);
    type("zzz");
    expect(await screen.findByText(/No SEC-registered company matches/)).toBeInTheDocument();
    expect(screen.getByText(/do not file with the SEC are not covered/)).toBeInTheDocument();
  });

  it("shows an error message, not a crash, when the search fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response([], false)));
    render(<CompanySearch debounceMs={0} />);
    type("app");
    expect(await screen.findByText(/Search is unavailable right now/)).toBeInTheDocument();
  });

  it("does not call the API for an empty or blank query", async () => {
    const fetchMock = vi.fn(() => response([]));
    vi.stubGlobal("fetch", fetchMock);
    render(<CompanySearch debounceMs={0} />);
    type("   ");
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces: only the final text is searched", async () => {
    const fetchMock = vi.fn(() => response([apple]));
    vi.stubGlobal("fetch", fetchMock);
    render(<CompanySearch debounceMs={60} />);
    type("a");
    type("ap");
    type("app");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain("q=app");
  });
});
