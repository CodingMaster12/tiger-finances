import Link from "next/link";
import type { ReactNode } from "react";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md font-bold tracking-tight text-brand">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-brand text-sm text-white"
      >
        M
      </span>
      <span className="text-[17px]">Meridian</span>
    </Link>
  );
}

const nav = [
  { href: "/", label: "Home" },
  { href: "/styleguide", label: "Design system" },
];

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
          <nav aria-label="Primary" className="flex items-center gap-1 text-sm font-medium text-muted">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-text">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
