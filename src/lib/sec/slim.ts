import { formatDate } from "@/lib/format";
import { annualKeyMetrics } from "./metrics";
import type { CompanyFinancials, DataPoint, FinancialsView } from "./types";

/**
 * Small, serialisable shapes of the financial statements for the browser, with provenance already
 * turned into plain-language hover text. Used by the Numbers page and the company page.
 */
export interface SlimPoint {
  v: number;
  unit: string;
  calc: boolean;
  restated: boolean;
  /** Plain-language provenance shown on hover/focus and read by screen readers. */
  tip: string;
}
export interface SlimStatement {
  id: "income" | "balance" | "cashflow";
  title: string;
  columns: { end: string; fp: string }[];
  rows: { key: string; label: string; unitType: "money" | "perShare" | "shares"; values: (SlimPoint | null)[] }[];
}
export interface SlimCompany {
  id: string;
  name: string;
  ticker: string;
  color: "gold" | "pink" | "cyan";
  currency: string | null;
  standard: string;
  industry: string | null;
  notes: string[];
  annual: SlimStatement[];
  quarterly: SlimStatement[];
  metrics: { label: string; value: number | null; kind: "delta" | "percent" }[];
}

const slimPoint = (p: DataPoint | null): SlimPoint | null =>
  p
    ? {
        v: p.value,
        unit: p.unit,
        calc: p.kind === "calculated",
        restated: Boolean(p.restated),
        tip:
          p.kind === "calculated"
            ? `${p.note ?? "Calculated by Tiger Finances."} Based on ${p.form} filed ${formatDate(p.filed)} (${p.accession}).`
            : `Reported in ${p.form}, filed ${formatDate(p.filed)} (${p.accession}).${p.restated ? " A later filing changed this number." : ""}`,
      }
    : null;

const slimView = (v: FinancialsView): SlimStatement[] =>
  v.statements.map((s) => ({
    id: s.id,
    title: s.title,
    columns: s.columns.map((c) => ({ end: c.periodEnd, fp: c.fiscalPeriod })),
    rows: s.rows.map((r) => ({ key: r.key, label: r.label, unitType: r.unitType, values: r.values.map(slimPoint) })),
  }));

export function slimCompany(id: string, ticker: string, color: SlimCompany["color"], f: CompanyFinancials): SlimCompany {
  const m = annualKeyMetrics(f)[0];
  return {
    id,
    name: f.company.name
      .replace(/\b([A-Z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase())
      .replace(/\b(Of|And|The)\b/g, (w) => w.toLowerCase()),
    ticker,
    color,
    currency: f.currency,
    standard: f.accountingStandard,
    industry: f.company.industry,
    notes: f.notes,
    annual: slimView(f.annual),
    quarterly: slimView(f.quarterly),
    metrics: [
      { label: "Revenue growth", value: m.revenueGrowthPct, kind: "delta" },
      { label: "Gross margin", value: m.grossMarginPct, kind: "percent" },
      { label: "Operating margin", value: m.operatingMarginPct, kind: "percent" },
      { label: "Net margin", value: m.netMarginPct, kind: "percent" },
    ],
  };
}

