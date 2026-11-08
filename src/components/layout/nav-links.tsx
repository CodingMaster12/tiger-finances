"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/numbers", label: "Numbers" },
];

/** Primary navigation. The current page is marked with aria-current and a gradient underline. */
export function NavLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={className}>
      {NAV.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap rounded-md px-3 py-1.5 font-display text-[13px] font-medium uppercase tracking-[0.16em] transition-colors",
              "hover:text-brand",
              active ? "text-text" : "text-muted",
              linkClassName,
            )}
          >
            {n.label}
            {active && <span aria-hidden className="bg-hot absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full" />}
          </Link>
        );
      })}
    </nav>
  );
}
