/** Display formatting. Missing values render as an em dash, never as 0. */
export const UNAVAILABLE = "—";

const ok = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function formatNumber(v: number | null | undefined, digits = 2): string {
  if (!ok(v)) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function formatCurrency(v: number | null | undefined, currency = "USD", digits = 2): string {
  if (!ok(v)) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

/** Large values: 1.23T, 4.5B, 780.1M, with an optional currency code suffix handled by callers. */
export function formatCompact(v: number | null | undefined, digits = 1): string {
  if (!ok(v)) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(v);
}

/** Percent units in, signed string out: 4.2 -> "+4.20%". */
export function formatPercent(v: number | null | undefined, digits = 2, signed = true): string {
  if (!ok(v)) return UNAVAILABLE;
  const s = formatNumber(Math.abs(v), digits);
  const sign = v < 0 ? "−" : signed && v > 0 ? "+" : "";
  return `${sign}${s}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return UNAVAILABLE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return UNAVAILABLE;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
