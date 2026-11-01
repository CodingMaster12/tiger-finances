import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { cn } from "./cn";

/**
 * A signed change. Direction is conveyed by arrow, sign and color together,
 * so color is never the only signal.
 */
export function Delta({ value, digits = 2 }: { value: number | null | undefined; digits?: number }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="num text-subtle">—</span>;
  }
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 font-medium",
        value > 0 && "text-positive",
        value < 0 && "text-negative",
        value === 0 && "text-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatPercent(value, digits)}
    </span>
  );
}
