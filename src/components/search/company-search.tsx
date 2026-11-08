"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";
import type { SearchResponse } from "@/lib/sec/search-service";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Company search box with a results list (ARIA combobox). Type to search, arrow keys to move, Enter to open,
 * Escape to close. Submitting with nothing highlighted goes to the full results page (also works without JavaScript).
 * Requests are debounced and cancelled when a newer one starts.
 */
export function CompanySearch({
  size = "header",
  debounceMs = 200,
  className,
  autoFocus,
}: {
  size?: "header" | "hero";
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const root = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as SearchResponse);
        setStatus("ready");
        setActive(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, debounceMs]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hasQuery = query.trim().length > 0;
  const results = hasQuery ? (data?.results ?? []) : [];
  const showPanel = open && hasQuery;

  const go = (cik: string) => {
    setOpen(false);
    router.push(`/company/${cik}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0 && results[active]) {
      e.preventDefault();
      go(results[active].cik);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const statusText = !hasQuery
    ? ""
    : status === "loading" ? "Searching" : status === "error" ? "Search is unavailable" : status === "ready" ? `${results.length} ${results.length === 1 ? "result" : "results"}` : "";

  return (
    <form ref={root} role="search" action="/search" className={cn("relative w-full", className)}>
      <label htmlFor={`${uid}-input`} className="sr-only">
        Search companies by name or ticker
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          id={`${uid}-input`}
          name="q"
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          placeholder="Search a company or ticker"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setStatus(e.target.value.trim() ? "loading" : "idle");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-md border border-border bg-surface pl-9 pr-9 text-text placeholder:text-subtle",
            "transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
            size === "hero" ? "h-12 text-[15px]" : "h-9 text-sm",
          )}
        />
        {status === "loading" && <Loader2 aria-hidden className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" />}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {statusText}
      </p>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-border bg-surface shadow-md">
          <ul id={listId} role="listbox" aria-label="Companies" className="max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <li
                key={r.cik}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.cik)}
                onMouseEnter={() => setActive(i)}
                className={cn("cursor-pointer border-b border-border px-4 py-2.5 last:border-b-0", i === active && "bg-surface-2")}
              >
                <span className={cn("block text-sm font-semibold", i === active ? "text-brand" : "text-text")}>{r.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {r.tickers.map((t) => (
                    <span key={t.ticker} className="num">
                      {t.ticker}
                      {t.exchange ? ` · ${t.exchange}` : ""}
                    </span>
                  ))}
                </span>
                {r.note && <span className="mt-0.5 block text-xs text-subtle">{r.note}</span>}
              </li>
            ))}
          </ul>
          {status === "ready" && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">
              No SEC-registered company matches &ldquo;{query.trim()}&rdquo;. Canadian companies that do not file with the SEC are not covered.
            </p>
          )}
          {status === "error" && <p className="px-4 py-3 text-sm text-negative">Search is unavailable right now. Please try again.</p>}
          {status === "loading" && results.length === 0 && <p className="px-4 py-3 text-sm text-muted">Searching…</p>}
          {status === "ready" && results.length > 0 && (
            <a href={`/search?q=${encodeURIComponent(query.trim())}`} className="block border-t border-border px-4 py-2 text-xs font-semibold text-brand hover:bg-surface-2">
              See all results
            </a>
          )}
        </div>
      )}
    </form>
  );
}
