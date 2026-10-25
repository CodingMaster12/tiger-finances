import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./account-menu";

export function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md font-bold tracking-tight text-brand">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-brand text-sm text-white"
      >
        T
      </span>
      <span className="text-[17px]">Tiger Finances</span>
    </Link>
  );
}

const nav = [
  { href: "/", label: "Home" },
  { href: "/styleguide", label: "Design system" },
];

async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-semibold text-text hover:bg-surface-2">Sign in</Link>
        <Link href="/register" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-hover">Sign up</Link>
      </div>
    );
  }
  const { data: profile } = await supabase.from("profiles").select("username, display_name").maybeSingle();
  const email = data.user.email ?? "";
  const name = profile?.display_name || profile?.username || email;
  const initials = (name.match(/[A-Za-z0-9]/g) ?? ["?"]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="ml-auto">
      <AccountMenu initials={initials} name={name} email={email} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Primary" className="hidden items-center sm:flex gap-1 whitespace-nowrap text-sm font-medium text-muted">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-text">
                {n.label}
              </Link>
            ))}
          </nav>
          <Suspense fallback={<div aria-hidden className="ml-auto h-8 w-24" />}>
            <HeaderAccount />
          </Suspense>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
