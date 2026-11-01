import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-10">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-brand">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
        {!isSupabaseConfigured() && (
          <p role="status" className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
            Accounts aren’t configured on this server yet. Follow docs/SUPABASE_SETUP.md, then restart the app.
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}
