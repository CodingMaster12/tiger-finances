"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

/** Modal built on the native <dialog>, which provides focus trapping, Esc, and inert background. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,440px)] rounded-lg border border-border bg-surface p-0 text-text shadow-md backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 id="dialog-title" className="text-[15px] font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" aria-label="Close dialog" onClick={onClose} className="!px-2">
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
