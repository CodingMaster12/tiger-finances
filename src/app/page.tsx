import Link from "next/link";
import { HeroVisual } from "@/components/home/hero-visual";
import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/format";

// Real figures from Apple's SEC filings (the same data our tests use). Shown as a worked example of how
// every number is traced; nothing on this page is live market data.
const EXAMPLE = {
  company: "Apple Inc.",
  fullYear: { label: "Revenue, year ended 26 Sep 2026", value: 478_834_000_000, meta: "Form 10-K, filed 3 Nov 2026", accession: "0000320193-26-000026" },
  quarter: { label: "Revenue, fourth quarter 2026", value: 114_477_000_000, meta: "Full year minus the first nine months" },
};

const coverage: { label: string; status: string; on: boolean }[] = [
  { label: "US companies that file with the SEC", status: "Available", on: true },
  { label: "Canadian companies that file with the SEC (kept in CAD)", status: "Available", on: true },
  { label: "Canadian companies that do not file with the SEC", status: "Not covered", on: false },
  { label: "Stock prices and valuation ratios", status: "Not available", on: false },
];

function PanelTitle({ children }: { children: string }) {
  return <h2 className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-muted">{children}</h2>;
}

export default function Home() {
  return (
    <div className="-mt-2">
      <section
        aria-labelledby="home-title"
        className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -inset-y-6 -z-10"
          style={{ background: "radial-gradient(55% 60% at 72% 42%, rgb(240 138 60 / 0.11), transparent 70%)" }}
        />
        <div className="py-6 lg:py-14">
          <h1
            id="home-title"
            className="font-display text-[clamp(2.1rem,5.2vw,4.5rem)] font-extralight uppercase leading-[1.1] tracking-[0.1em] text-text text-balance"
          >
            Trace every number <span className="block text-brand">to its filing</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-pretty text-base leading-relaxed text-muted">
            Tiger Finances reads company financials straight from SEC filings. Every figure shows where it came from,
            which period it covers and what currency it is in, and a gap says so plainly instead of being guessed.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-on-accent shadow-glow transition-colors hover:bg-accent-hover"
            >
              Create your workspace
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-brand"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-8 flex items-center gap-2.5 text-[13px] text-muted">
            <span aria-hidden className="size-2 rounded-full bg-lining" />
            Data source: SEC EDGAR. Stock prices are not available yet.
          </p>
        </div>

        <HeroVisual className="mx-auto w-full max-w-[640px] lg:max-w-none" />
      </section>

      <section aria-label="How the numbers work" className="mt-6 grid border-t border-border md:grid-cols-3 md:divide-x md:divide-border">
        <div className="py-7 md:pr-8">
          <PanelTitle>Source trail</PanelTitle>
          <p className="mt-1 text-[13px] text-subtle">Example: {EXAMPLE.company}, from its SEC filings</p>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-[13px] text-muted">{EXAMPLE.fullYear.label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="num font-display text-2xl font-light text-text">${formatCompact(EXAMPLE.fullYear.value, 2)}</span>
                <Badge tone="lining">Reported</Badge>
              </dd>
              <dd className="mt-1 text-xs text-subtle">{EXAMPLE.fullYear.meta} · USD</dd>
              <dd className="num mt-0.5 text-xs text-subtle">Filing {EXAMPLE.fullYear.accession}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{EXAMPLE.quarter.label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="num font-display text-2xl font-light text-text">${formatCompact(EXAMPLE.quarter.value, 2)}</span>
                <Badge tone="warning">Calculated</Badge>
              </dd>
              <dd className="mt-1 text-xs text-subtle">{EXAMPLE.quarter.meta}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-border py-7 md:border-t-0 md:px-8">
          <PanelTitle>Data coverage</PanelTitle>
          <ul className="mt-5 space-y-3.5">
            {coverage.map((c) => (
              <li key={c.label} className="flex items-start justify-between gap-4 text-[13px]">
                <span className="flex items-start gap-2.5 text-text">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${c.on ? "bg-accent" : "bg-border-strong"}`} />
                  {c.label}
                </span>
                <span className={`shrink-0 ${c.on ? "text-brand" : "text-subtle"}`}>{c.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-subtle">Describes the data engine. Search and company pages arrive in the next milestones.</p>
        </div>

        <div className="border-t border-border py-7 md:border-t-0 md:pl-8">
          <PanelTitle>How to read a number</PanelTitle>
          <ul className="mt-5 space-y-4 text-[13px]">
            <li className="flex items-start gap-3">
              <Badge tone="lining">Reported</Badge>
              <span className="text-muted">Taken directly from a filing.</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge tone="warning">Calculated</Badge>
              <span className="text-muted">Worked out by us, with the method shown.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="num inline-flex w-[5.5rem] shrink-0 justify-center rounded-full bg-surface-2 py-0.5 text-xs font-semibold text-muted">—</span>
              <span className="text-muted">Not available. Never guessed or filled in.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
