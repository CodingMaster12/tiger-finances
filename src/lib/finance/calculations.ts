/**
 * Pure financial calculations. Every function returns `null` when the result
 * is undefined or not meaningful (missing input, zero/negative denominator),
 * never NaN, Infinity, or a fabricated value. Percentages are returned in
 * percent units (12.5 means 12.5%).
 */

export type Maybe = number | null | undefined;

const isNum = (v: Maybe): v is number => typeof v === "number" && Number.isFinite(v);

/** ((current / prior) - 1) × 100. Undefined when prior is not positive. */
export function growthPercent(current: Maybe, prior: Maybe): number | null {
  if (!isNum(current) || !isNum(prior) || prior <= 0) return null;
  return (current / prior - 1) * 100;
}

/** (numerator / revenue) × 100. Undefined when revenue is not positive. */
export function marginPercent(numerator: Maybe, revenue: Maybe): number | null {
  if (!isNum(numerator) || !isNum(revenue) || revenue <= 0) return null;
  return (numerator / revenue) * 100;
}

/**
 * Free cash flow = operating cash flow − capital expenditures.
 * Providers report capex as a negative outflow or a positive amount, so the
 * magnitude is used: capex is always treated as cash leaving the business.
 */
export function freeCashFlow(operatingCashFlow: Maybe, capex: Maybe): number | null {
  if (!isNum(operatingCashFlow) || !isNum(capex)) return null;
  return operatingCashFlow - Math.abs(capex);
}

/** Price / EPS. Undefined for zero or negative earnings (no meaningful P/E). */
export function priceToEarnings(price: Maybe, eps: Maybe): number | null {
  if (!isNum(price) || !isNum(eps) || eps <= 0 || price < 0) return null;
  return price / eps;
}

/** Generic ratio a / b, undefined when b is not positive. */
export function ratio(a: Maybe, b: Maybe): number | null {
  if (!isNum(a) || !isNum(b) || b <= 0) return null;
  return a / b;
}

/**
 * Price return over a series of closing prices, in percent. This excludes
 * dividends, so it must be labelled "price return", never "total return".
 */
export function priceReturnPercent(closes: readonly number[]): number | null {
  if (closes.length < 2) return null;
  return growthPercent(closes[closes.length - 1], closes[0]);
}

/** Rebase a price series to 0% at its first observation for comparisons. */
export function rebaseToPercent(closes: readonly number[]): (number | null)[] {
  const base = closes[0];
  if (!isNum(base) || base <= 0) return closes.map(() => null);
  return closes.map((c) => (isNum(c) ? (c / base - 1) * 100 : null));
}
