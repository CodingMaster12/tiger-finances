import { growthPercent, marginPercent } from "@/lib/finance/calculations";
import type { CompanyFinancials, DataPoint } from "./types";
import { daysBetween } from "./facts";

export interface KeyMetricsColumn {
  periodEnd: string;
  revenue: DataPoint | null;
  /** Year-over-year, only when the prior column is about one year earlier. */
  revenueGrowthPct: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  freeCashFlow: DataPoint | null;
}

/** Locally calculated annual metrics. Every value is a ratio of reported numbers; missing inputs give null. */
export function annualKeyMetrics(f: CompanyFinancials): KeyMetricsColumn[] {
  const rows = new Map(f.annual.statements.flatMap((s) => s.rows).map((r) => [r.key, r.values]));
  const cols = f.annual.statements[0].columns;
  const get = (key: string, i: number) => rows.get(key)?.[i] ?? null;
  return cols.map((c, i) => {
    const revenue = get("revenue", i);
    const prior = get("revenue", i + 1);
    const yearApart = prior && revenue && Math.abs(daysBetween(prior.periodEnd, revenue.periodEnd) - 365) <= 10;
    return {
      periodEnd: c.periodEnd,
      revenue,
      revenueGrowthPct: yearApart ? growthPercent(revenue.value, prior.value) : null,
      grossMarginPct: marginPercent(get("grossProfit", i)?.value, revenue?.value),
      operatingMarginPct: marginPercent(get("operatingIncome", i)?.value, revenue?.value),
      netMarginPct: marginPercent(get("netIncome", i)?.value, revenue?.value),
      freeCashFlow: get("freeCashFlow", i),
    };
  });
}
