import { formatDate } from "@/lib/format";
import aaplFacts from "./__fixtures__/aapl.facts.json";
import aaplProfile from "./__fixtures__/aapl.submissions.json";
import rbcFacts from "./__fixtures__/ry.facts.json";
import rbcProfile from "./__fixtures__/ry.submissions.json";
import shopFacts from "./__fixtures__/shop.facts.json";
import shopProfile from "./__fixtures__/shop.submissions.json";
import { annualKeyMetrics } from "./metrics";
import { buildFinancials } from "./statements";
import type { CompanyFinancials, DataPoint, FinancialsView } from "./types";

/**
 * Real statements from three companies' SEC filings, saved in the repo, so the Numbers page works
 * before company search exists. Built with the same engine that will serve live data. Server-only.
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

function slim(id: string, ticker: string, color: SlimCompany["color"], f: CompanyFinancials): SlimCompany {
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

let cached: SlimCompany[] | null = null;
export function getSampleCompanies(): SlimCompany[] {
  if (cached) return cached;
  const at = "saved copy";
  cached = [
    slim("aapl", "AAPL", "gold", buildFinancials(aaplFacts, aaplProfile, at)),
    slim("shop", "SHOP", "pink", buildFinancials(shopFacts, shopProfile, at)),
    slim("ry", "RY", "cyan", buildFinancials(rbcFacts, rbcProfile, at)),
  ];
  return cached;
}
