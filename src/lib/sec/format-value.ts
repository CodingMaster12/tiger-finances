import type { SlimPoint } from "./slim";

/** Deterministic formatting (no Intl), so the server and the browser always print the same text. */
function trim(n: number, digits: number): string {
  return String(parseFloat(n.toFixed(digits)));
}
export function formatValue(p: SlimPoint, unitType: "money" | "perShare" | "shares"): string {
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
