import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./account-menu";
import { NavLinks } from "./nav-links";
import { SiteFooter } from "./site-footer";

export function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md font-display font-light uppercase tracking-[0.14em] text-text sm:tracking-[0.22em]">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-hot font-display text-sm font-semibold text-on-accent"
      >
        T
      </span>
      <span className="text-[15px]">Tiger Finances</span>
    </Link>
  );
}


async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link href="/login" className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-text hover:bg-surface-2 hover:text-brand">Sign in</Link>
        <Link href="/register" className="bg-hot whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-semibold text-on-accent shadow-glow transition-[filter] hover:brightness-110">Sign up</Link>
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
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Wordmark />
          <NavLinks className="hidden items-center gap-1 sm:flex" />
          <Suspense fallback={<div aria-hidden className="ml-auto h-8 w-24" />}>
            <HeaderAccount />
          </Suspense>
        </div>
        <NavLinks className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-1 sm:hidden" />
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
