"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/auth/actions";

export function AccountMenu({ initials, name, email }: { initials: string; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-2"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{initials}</span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-md border border-border bg-surface shadow-md">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-[13px] text-muted">{email}</p>
          </div>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-2">
            <Settings className="size-4 text-muted" aria-hidden /> Account settings
          </Link>
          <form action={logout}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-2">
              <LogOut className="size-4 text-muted" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
