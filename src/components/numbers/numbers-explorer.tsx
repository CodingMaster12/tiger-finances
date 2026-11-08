"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Table, TableWrap, Td, Th } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { formatPercent, UNAVAILABLE } from "@/lib/format";
import type { SlimCompany, SlimPoint, SlimStatement } from "@/lib/sec/sample";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const dot: Record<SlimCompany["color"], string> = { gold: "bg-accent", pink: "bg-pink", cyan: "bg-cyan" };
const ring: Record<SlimCompany["color"], string> = {
  gold: "border-accent bg-accent-soft text-text",
  pink: "border-pink bg-pink-soft text-text",
  cyan: "border-cyan bg-cyan-soft text-text",
};

/** Deterministic formatting (no Intl), so the server and the browser always print the same text. */
function trim(n: number, digits: number): string {
  return String(parseFloat(n.toFixed(digits)));
}
function formatValue(p: SlimPoint, unitType: "money" | "perShare" | "shares"): string {
  const code = p.unit.slice(0, 3);
  const prefix = code === "USD" ? "$" : `${code}\u00a0`;
  const sign = p.v < 0 ? "\u2212" : "";
  const abs = Math.abs(p.v);
  if (unitType === "perShare") return `${sign}${prefix}${abs.toFixed(2)}`;
  const steps: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const hit = steps.find(([n]) => abs >= n);
  const body = hit ? `${trim(abs / hit[0], 2)}${hit[1]}` : trim(abs, 2);
  return unitType === "shares" ? `${sign}${body}` : `${sign}${prefix}${body}`;
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-border-strong bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-[5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            value === o.id ? "bg-hot text-on-accent" : "text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatementTable({ s }: { s: SlimStatement }) {
  if (s.columns.length === 0) return <p className="p-6 text-sm text-muted">No data was found in this company&apos;s filings for this view.</p>;
  return (
    <TableWrap aria-label={`${s.title} table`}>
      <Table>
        <thead>
          <tr>
            <Th className="sticky left-0 bg-surface">{s.title}</Th>
            {s.columns.map((c) => (
              <Th key={c.end} numeric>
                {c.fp} {monthYear(c.end)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.key}>
              <Td className="sticky left-0 bg-surface font-medium text-text">{r.label}</Td>
              {r.values.map((p, i) => (
                <Td key={i} numeric className={p ? "text-text" : undefined}>
                  {p ? (
                    <span title={p.tip} className="inline-flex items-center justify-end gap-1.5">
                      {formatValue(p, r.unitType)}
                      {p.calc && <span className="rounded bg-warning-soft px-1 text-[10px] font-semibold uppercase text-warning" aria-label="calculated">calc</span>}
                      {p.restated && <span className="rounded bg-cyan-soft px-1 text-[10px] font-semibold uppercase text-cyan" aria-label="changed by a later filing">upd</span>}
                      <span className="sr-only">{p.tip}</span>
                    </span>
                  ) : (
                    <span className="text-subtle" title="Not available in the filings. Never guessed.">
                      {UNAVAILABLE}
                      <span className="sr-only">Not available</span>
                    </span>
                  )}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

export function NumbersExplorer({ companies }: { companies: SlimCompany[] }) {
  const [companyId, setCompanyId] = useState(companies[0].id);
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const [statementId, setStatementId] = useState<SlimStatement["id"]>("income");
  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const statements = period === "annual" ? company.annual : company.quarterly;
  const statement = statements.find((s) => s.id === statementId) ?? statements[0];

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Company" className="flex flex-wrap gap-3">
        {companies.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === companyId}
            onClick={() => setCompanyId(c.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              c.id === companyId ? ring[c.color] : "border-border bg-surface text-muted hover:border-border-strong hover:text-text",
            )}
          >
            <span aria-hidden className={cn("size-2.5 rounded-full", dot[c.color])} />
            <span>
              <span className="block text-sm font-semibold">{c.name}</span>
              <span className="block text-xs text-subtle">
                {c.ticker} · {c.currency ?? "—"} · {c.standard === "ifrs-full" ? "IFRS" : c.standard === "us-gaap" ? "US GAAP" : "—"}
              </span>
            </span>
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {company.metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="mt-1 text-lg font-semibold">
              {m.kind === "delta" ? <Delta value={m.value} /> : <span className="num">{m.value == null ? UNAVAILABLE : formatPercent(m.value, 1, false)}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-subtle">Latest fiscal year, calculated from the reported figures below.</p>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <Segmented
            label="Statement"
            value={statementId}
            onChange={setStatementId}
            options={[
              { id: "income", label: "Income" },
              { id: "balance", label: "Balance sheet" },
              { id: "cashflow", label: "Cash flow" },
            ]}
          />
          <Segmented label="Period" value={period} onChange={setPeriod} options={[{ id: "annual", label: "Annual" }, { id: "quarterly", label: "Quarterly" }]} />
        </div>
        <StatementTable s={statement} />
        <div className="space-y-1 border-t border-border px-4 py-3 text-xs text-subtle">
          <p>
            Source: SEC EDGAR filings (saved copy). {company.industry ? `${company.industry}. ` : ""}Hover a figure for its filing, date and accession number.
          </p>
          {company.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="legend-title" className="rounded-lg border border-border bg-surface p-5">
          <h2 id="legend-title" className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-muted">How to read a number</h2>
          <ul className="mt-4 space-y-3 text-[13px]">
            <li className="flex items-start gap-3"><Badge tone="lining">Reported</Badge><span className="text-muted">Taken directly from a filing.</span></li>
            <li className="flex items-start gap-3"><Badge tone="warning">calc</Badge><span className="text-muted">Worked out by us, with the method shown on hover.</span></li>
            <li className="flex items-start gap-3"><Badge tone="info">upd</Badge><span className="text-muted">A later filing changed this number; we show the latest.</span></li>
            <li className="flex items-start gap-3"><span className="num inline-flex w-14 shrink-0 justify-center rounded-full bg-surface-2 py-0.5 text-xs font-semibold text-muted">—</span><span className="text-muted">Not available. Never guessed or filled in.</span></li>
          </ul>
        </section>
        <section aria-labelledby="coverage-title" className="rounded-lg border border-border bg-surface p-5">
          <h2 id="coverage-title" className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-muted">Data coverage</h2>
          <ul className="mt-4 space-y-3 text-[13px]">
            {[
              ["US companies that file with the SEC", "Available", true],
              ["Canadian companies that file with the SEC (kept in CAD)", "Available", true],
              ["Canadian companies that do not file with the SEC", "Not covered", false],
              ["Stock prices and valuation ratios", "Not available", false],
            ].map(([label, status, on]) => (
              <li key={label as string} className="flex items-start justify-between gap-4">
                <span className="flex items-start gap-2.5"><span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", on ? "bg-lining" : "bg-border-strong")} />{label}</span>
                <span className={cn("shrink-0", on ? "text-lining" : "text-subtle")}>{status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
