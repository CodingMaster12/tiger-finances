import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompanySearch } from "@/components/search/company-search";
import { EmptyState } from "@/components/ui/states";
import { runSearch } from "@/lib/sec/search-service";

export const metadata: Metadata = {
  title: "Search",
  description: "Find a company that files with the SEC by name or ticker.",
};

async function Results({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  if (!q.trim()) {
    return <p className="text-sm text-muted">Type a company name or ticker above. Try Apple, Shopify or Royal Bank.</p>;
  }
  const { query, results, complete } = runSearch(q, 25);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted" aria-live="polite">
        {results.length === 0 ? "No results" : `${results.length} ${results.length === 1 ? "company" : "companies"}`} for &ldquo;{query}&rdquo;
      </p>
      {results.length === 0 ? (
        <EmptyState
          title="No SEC-registered company matches"
          description="Check the spelling or try the ticker. Canadian companies that do not file with the SEC are not covered."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {results.map((r) => (
            <li key={r.cik}>
              <Link href={`/company/${r.cik}`} className="block px-5 py-4 transition-colors hover:bg-surface-2">
                <span className="block text-base font-semibold text-text">{r.name}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                  {r.tickers.map((t) => (
                    <span key={t.ticker} className="num">
                      {t.ticker}
                      {t.exchange ? ` · ${t.exchange}` : ""}
                    </span>
                  ))}
                </span>
                {r.note && <span className="mt-1 block text-xs text-subtle">{r.note}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!complete && (
        <p className="text-xs text-subtle">
          Search currently covers a starter list of companies. The full SEC list is added when the site is next updated.
        </p>
      )}
    </div>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold tracking-[0.02em] sm:text-5xl">Search</h1>
      <div className="max-w-xl">
        <CompanySearch size="hero" />
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
