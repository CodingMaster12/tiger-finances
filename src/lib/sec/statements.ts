/**
 * Assembles income statement, balance sheet and cash flow (annual and quarterly) from SEC facts.
 * Pure: pass in the parsed facts, the company profile and a timestamp.
 */
import { freeCashFlow } from "@/lib/finance/calculations";
import { isFinancialSic, METRICS, type MetricDef } from "./concepts";
import {
  clusterDates,
  daysBetween,
  flowYears,
  indexFacts,
  instantMap,
  instantNear,
  type FactsIndex,
  type FlowYear,
  type InstantMap,
} from "./facts";
import {
  SOURCE_NAME,
  submissionsSchema,
  SecError,
  type CompanyFinancials,
  type CompanyProfile,
  type DataPoint,
  type FinancialsView,
  type PeriodColumn,
  type Statement,
  type StatementRow,
} from "./types";

export const ANNUAL_COLUMNS = 5;
export const QUARTER_COLUMNS = 8;

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

export function parseProfile(raw: unknown): CompanyProfile {
  const p = submissionsSchema.safeParse(raw);
  if (!p.success) throw new SecError("invalid_data", "SEC company profile did not have the expected shape.");
  const s = p.data;
  return {
    cik: padCik(s.cik),
    name: s.name,
    tickers: s.tickers,
    exchanges: s.exchanges,
    sic: s.sic || null,
    industry: s.sicDescription || null,
    fiscalYearEnd: s.fiscalYearEnd || null,
    isFinancial: isFinancialSic(s.sic),
  };
}

type Series =
  | { kind: "flow"; years: FlowYear[] }
  | { kind: "instant"; map: InstantMap; totalConcepts: Set<string> };

function buildSeries(index: FactsIndex, metric: MetricDef): Series {
  const cands = index.candidates(metric);
  if (metric.kind === "flow") return { kind: "flow", years: flowYears(cands, metric.unitType === "money") };
  return {
    kind: "instant",
    map: instantMap(cands),
    totalConcepts: new Set(cands.filter((c) => c.total).map((c) => c.concept)),
  };
}

const annualPoint = (s: Series, end: string): DataPoint | null => {
  if (s.kind === "instant") return instantNear(s.map, end);
  const y = s.years.find((y) => y.annual && Math.abs(daysBetween(y.annual.periodEnd, end)) <= 7);
  return y?.annual ?? null;
};

const quarterPoint = (s: Series, end: string): DataPoint | null => {
  if (s.kind === "instant") return instantNear(s.map, end);
  for (const y of s.years) for (const p of y.quarters.values()) if (Math.abs(daysBetween(p.periodEnd, end)) <= 7) return p;
  return null;
};

function annualColumns(series: Map<string, Series>): PeriodColumn[] {
  const ends: string[] = [];
  for (const s of series.values()) if (s.kind === "flow") for (const y of s.years) if (y.annual) ends.push(y.annual.periodEnd);
  return clusterDates(ends, 10)
    .slice(-ANNUAL_COLUMNS)
    .reverse()
    .map((periodEnd) => ({ periodEnd, fiscalPeriod: "FY" as const }));
}

function quarterColumns(series: Map<string, Series>): PeriodColumn[] {
  const labelByEnd = new Map<string, "Q1" | "Q2" | "Q3" | "Q4">();
  for (const s of series.values()) {
    if (s.kind !== "flow") continue;
    for (const y of s.years) for (const [q, p] of y.quarters) if (!labelByEnd.has(p.periodEnd)) labelByEnd.set(p.periodEnd, `Q${q}`);
  }
  return clusterDates([...labelByEnd.keys()], 10)
    .slice(-QUARTER_COLUMNS)
    .reverse()
    .map((periodEnd) => {
      // Any member of the cluster carries the quarter label; take the nearest recorded one.
      const key = [...labelByEnd.keys()].sort((a, b) => Math.abs(daysBetween(a, periodEnd)) - Math.abs(daysBetween(b, periodEnd)))[0];
      return { periodEnd, fiscalPeriod: labelByEnd.get(key)! };
    });
}

const sameUnit = (...ps: (DataPoint | null)[]): boolean => ps.every((p) => p) && new Set(ps.map((p) => p!.unit)).size === 1;

function buildView(
  series: Map<string, Series>,
  columns: PeriodColumn[],
  pick: (s: Series, end: string) => DataPoint | null,
  isFinancial: boolean,
): FinancialsView {
  const values = (key: string): (DataPoint | null)[] => {
    const s = series.get(key);
    return columns.map((c) => (s ? pick(s, c.periodEnd) : null));
  };
  const rows = new Map<string, StatementRow>();
  for (const m of METRICS) {
    if (m.hideForFinancials && isFinancial) continue;
    rows.set(m.key, { key: m.key, label: m.label, unitType: m.unitType, values: values(m.key) });
  }

  // Gross profit = revenue - cost of revenue, only where the company did not report it.
  const gp = rows.get("grossProfit");
  const rev = rows.get("revenue");
  const cost = rows.get("costOfRevenue");
  if (gp && rev && cost) {
    gp.values = gp.values.map((v, i) => {
      if (v) return v;
      const r = rev.values[i];
      const c = cost.values[i];
      if (!r || !c || !sameUnit(r, c)) return null;
      return { ...r, value: r.value - c.value, kind: "calculated" as const, concept: "calculated", note: "Calculated: revenue minus cost of revenue." };
    });
  }

  // Total liabilities = total assets - total equity, only when equity is a true total (includes non-controlling interests).
  const liab = rows.get("totalLiabilities");
  const assets = rows.get("totalAssets");
  const equity = rows.get("totalEquity");
  const equitySeries = series.get("totalEquity");
  if (liab && assets && equity && equitySeries?.kind === "instant") {
    liab.values = liab.values.map((v, i) => {
      if (v) return v;
      const a = assets.values[i];
      const e = equity.values[i];
      if (!a || !e || !sameUnit(a, e) || !equitySeries.totalConcepts.has(e.concept)) return null;
      return { ...a, value: a.value - e.value, kind: "calculated" as const, concept: "calculated", note: "Calculated: total assets minus total equity." };
    });
  }

  // Free cash flow = operating cash flow - capital expenditures (not for banks/insurers).
  const ocf = rows.get("operatingCashFlow");
  const capex = rows.get("capex");
  if (ocf && capex) {
    rows.set("freeCashFlow", {
      key: "freeCashFlow",
      label: "Free cash flow",
      unitType: "money",
      values: ocf.values.map((o, i) => {
        const c = capex.values[i];
        if (!o || !c || !sameUnit(o, c)) return null;
        const v = freeCashFlow(o.value, c.value);
        return v === null ? null : { ...o, value: v, kind: "calculated" as const, concept: "calculated", note: "Calculated: operating cash flow minus capital expenditures." };
      }),
    });
  }

  const titles: Record<Statement["id"], string> = { income: "Income statement", balance: "Balance sheet", cashflow: "Cash flow" };
  const stmtOf = (id: Statement["id"], keys: string[]): Statement => ({
    id,
    title: titles[id],
    columns,
    rows: keys.map((k) => rows.get(k)).filter((r): r is StatementRow => Boolean(r)),
  });
  return {
    statements: [
      stmtOf("income", ["revenue", "costOfRevenue", "grossProfit", "operatingIncome", "netIncome", "epsDiluted"]),
      stmtOf("balance", ["cash", "totalAssets", "totalLiabilities", "totalEquity"]),
      stmtOf("cashflow", ["operatingCashFlow", "capex", "freeCashFlow"]),
    ],
  };
}

function summarize(view: FinancialsView) {
  const units = new Map<string, number>();
  const standards = new Map<string, number>();
  for (const st of view.statements)
    for (const r of st.rows)
      for (const v of r.values) {
        if (!v) continue;
        if (r.unitType === "money") units.set(v.unit, (units.get(v.unit) ?? 0) + 1);
        if (v.kind === "reported") {
          const std = v.concept.split(":")[0];
          standards.set(std, (standards.get(std) ?? 0) + 1);
        }
      }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { currency: top(units), standard: top(standards), currencies: [...units.keys()] };
}

export function buildFinancials(rawFacts: unknown, rawProfile: unknown, retrievedAt: string): CompanyFinancials {
  const index = indexFacts(rawFacts);
  const company = parseProfile(rawProfile);
  const series = new Map<string, Series>(METRICS.map((m) => [m.key, buildSeries(index, m)]));

  const annualCols = annualColumns(series);
  const quarterCols = quarterColumns(series);
  const annual = buildView(series, annualCols, annualPoint, company.isFinancial);
  const quarterly = buildView(series, quarterCols, quarterPoint, company.isFinancial);

  const { currency, standard, currencies } = summarize(annual);
  const notes: string[] = [];
  if (annualCols.length === 0) notes.push("No annual financial data was found in this company's SEC filings.");
  if (company.isFinancial)
    notes.push("Banks and insurers do not report gross profit, operating income or capital expenditures in a comparable way, so those rows are hidden.");
  if (currency && currency !== "USD") notes.push(`Reported in ${currency}. No currency conversion is applied.`);
  if (currencies.length > 1) notes.push(`Mixed currencies found (${currencies.join(", ")}); check each value's unit.`);
  if (index.droppedRows() > 0) notes.push(`${index.droppedRows()} malformed data rows from the SEC were ignored.`);

  return {
    company,
    currency,
    accountingStandard: standard === "us-gaap" || standard === "ifrs-full" ? standard : "unknown",
    annual,
    quarterly,
    source: { name: SOURCE_NAME, url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K`, retrievedAt },
    notes,
  };
}
