import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { UNAVAILABLE } from "@/lib/format";
import { cn } from "./cn";

/** Horizontally scrollable wrapper so wide statements never overflow the page. */
export function TableWrap({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto", className)} tabIndex={0} role="region" {...rest} />;
}

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...rest} />;
}

export function Th({ numeric, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border-strong px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({
  numeric,
  value,
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; value?: string | null }) {
  const content = children ?? (value == null || value === "" ? <span className="text-subtle" title="Not available">{UNAVAILABLE}</span> : value);
  return (
    <td
      className={cn("border-b border-border px-4 py-2.5", numeric && "num text-right", className)}
      {...rest}
    >
      {content}
    </td>
  );
}
