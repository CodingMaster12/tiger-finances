import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NumbersExplorer } from "@/components/numbers/numbers-explorer";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/delta";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, formatPercent, UNAVAILABLE } from "@/lib/format";
import { formatValue } from "@/lib/sec/format-value";
import { annualKeyMetrics } from "@/lib/sec/metrics";
import { daysSince } from "@/lib/sec/freshness";
import { lookup } from "@/lib/sec/lookup";
import { slimCompany } from "@/lib/sec/slim";
import type { CompanyFinancials } from "@/lib/sec/types";

export const metadata: Metadata = {
  title: "Company",
  description: "Financial statements for a company that files with the SEC, with every figure traced to its filing.",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fiscalYearEnd = (mmdd: string | null) => (mmdd && /^\d{4}$/.test(mmdd) ? `${MONTHS[Number(mmdd.slice(0, 2)) - 1]} ${Number(mmdd.slice(2))}` : UNAVAILABLE);
const toTitleCase = (name: string) =>
  name
    .replace(/\b([A-Z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase())
    .replace(/\b(Of|And|The)\b/g, (w) => w.toLowerCase());

function Skeleton() {
  return (
    <div role="status" aria-label="Loading company" className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-md bg-surface-2" />
      <div className="h-6 w-96 max-w-full animate-pulse rounded-md bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-surface-2" />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">{children}</span>;
}

const STALE_AFTER_DAYS = 45;

function Overview({ f, origin, retrievedAt }: { f: CompanyFinancials; origin: "database" | "live" | "saved"; retrievedAt: string | null }) {
  const saved = origin === "saved";
  const ageDays = daysSince(retrievedAt);
  const c = f.company;
  const slim = slimCompany(c.cik, c.tickers[0] ?? "", "gold", f);
  const m = annualKeyMetrics(f)[0];
  const revenue = m?.revenue ?? null;
  const rows = new Map(f.annual.statements.flatMap((s) => s.rows).map((r) => [r.key, r.values[0] ?? null]));
  const income = rows.get("netIncome") ?? null;
  const fcf = m?.freeCashFlow ?? null;
  const latestEnd = f.annual.statements[0]?.columns[0]?.periodEnd ?? null;
  const money = (p: typeof revenue) => (p ? formatValue({ v: p.value, unit: p.unit, calc: false, restated: false, tip: "" }, "money") : UNAVAILABLE);

  const stats: { label: string; value: React.ReactNode; hint?: string }[] = [
    { label: "Revenue", value: <span className="num">{money(revenue)}</span>, hint: latestEnd ? `Fiscal year ended ${formatDate(latestEnd)}` : undefined },
    { label: "Net income", value: <span className="num">{money(income)}</span> },
    { label: "Revenue growth", value: <Delta value={m?.revenueGrowthPct} /> },
    { label: "Net margin", value: <span className="num">{m?.netMarginPct == null ? UNAVAILABLE : formatPercent(m.netMarginPct, 1, false)}</span> },
    { label: "Free cash flow", value: <span className="num">{money(fcf)}</span>, hint: fcf ? "Calculated" : undefined },
    { label: "Gross margin", value: <span className="num">{m?.grossMarginPct == null ? UNAVAILABLE : formatPercent(m.grossMarginPct, 1, false)}</span> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
          <ArrowLeft className="size-4" aria-hidden /> Search
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[0.02em] sm:text-5xl">{toTitleCase(c.name)}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {c.tickers.map((t, i) => (
            <Badge key={t} tone="warning">
              {t}
              {c.exchanges[i] ? ` · ${c.exchanges[i]}` : ""}
            </Badge>
          ))}
          {c.industry && <Chip>{c.industry}</Chip>}
          <Chip>Fiscal year ends {fiscalYearEnd(c.fiscalYearEnd)}</Chip>
          {f.currency && <Chip>Reported in {f.currency}</Chip>}
          {f.accountingStandard !== "unknown" && <Chip>{f.accountingStandard === "ifrs-full" ? "IFRS" : "US GAAP"}</Chip>}
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          <span>
            Source: SEC EDGAR · {saved ? "saved copy" : `retrieved ${formatDate((retrievedAt ?? f.source.retrievedAt).slice(0, 10))}`}
          </span>
          <a href={f.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-brand">
            Filings on sec.gov <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
        {origin === "database" && ageDays > STALE_AFTER_DAYS && (
          <p role="note" className="mt-4 rounded-md border border-border-strong bg-surface px-4 py-3 text-sm text-muted">
            These figures were last refreshed {ageDays} days ago. A newer filing may exist; the data is refreshed regularly.
          </p>
        )}
        {saved && (
          <p role="note" className="mt-4 rounded-md border border-border-strong bg-surface px-4 py-3 text-sm text-muted">
            Live data is unavailable right now, so this is a saved copy of the company&apos;s SEC filings. Figures may be out of date.
          </p>
        )}
      </div>

      <section aria-labelledby="latest-title">
        <h2 id="latest-title" className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
          Latest fiscal year
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="mt-1 text-lg font-semibold">{s.value}</dd>
              {s.hint && <dd className="mt-0.5 text-[11px] text-subtle">{s.hint}</dd>}
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-subtle">Margins and growth are calculated from the reported figures below. Stock prices and valuation ratios are not available.</p>
      </section>

      <section aria-labelledby="statements-title" className="space-y-4">
        <h2 id="statements-title" className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
          Financial statements
        </h2>
        <NumbersExplorer companies={[slim]} showMetrics={false} sourceLabel={saved ? "SEC EDGAR filings (saved copy)" : "SEC EDGAR filings"} />
      </section>
    </div>
  );
}

function QueuedNotice({ name, cik }: { name: string; cik: string }) {
  return (
    <div className="space-y-6">
      <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Search
      </Link>
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          title={`Adding ${toTitleCase(name)}`}
          description="We do not have this company's filings saved yet. It has been queued and usually appears within a day. Check back soon."
          action={
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold">
              <Link href="/search" className="text-brand hover:underline">
                Search another company
              </Link>
              <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-brand">
                Filings on sec.gov <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          }
        />
      </div>
    </div>
  );
}

async function CompanyContent({ params }: { params: Promise<{ cik: string }> }) {
  // Company data is looked up (and cached) per request, never at build time.
  await connection();
  const { cik } = await params;
  if (!/^\d{1,10}$/.test(cik)) notFound();
  const padded = cik.padStart(10, "0");
  const result = await lookup(padded);
  if (result.kind === "not_found") notFound();
  if (result.kind === "ok") return <Overview f={result.data} origin={result.origin} retrievedAt={result.retrievedAt} />;
  if (result.kind === "queued") return <QueuedNotice name={result.name} cik={padded} />;
  return (
    <div className="space-y-6">
      <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Search
      </Link>
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState
          title={result.title}
          description={result.message}
          action={
            <Link href="/search" className="text-sm font-semibold text-brand hover:underline">
              Search another company
            </Link>
          }
        />
      </div>
    </div>
  );
}

export default function CompanyPage({ params }: PageProps<"/company/[cik]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <CompanyContent params={params} />
    </Suspense>
  );
}
