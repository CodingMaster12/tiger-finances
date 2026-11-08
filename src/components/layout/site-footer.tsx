import Link from "next/link";
import { Wordmark } from "./app-shell";

const columns = [
  { title: "Explore", links: [{ href: "/", label: "Home" }, { href: "/numbers", label: "Numbers" }] },
  { title: "Account", links: [{ href: "/login", label: "Sign in" }, { href: "/register", label: "Create account" }, { href: "/account", label: "Settings" }] },
  { title: "Project", links: [{ href: "/styleguide", label: "Design system" }] },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[34ch] text-[13px] text-muted">
            Company financials from SEC filings, with the receipts. Stock prices are not available yet.
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="font-display text-[12px] font-medium uppercase tracking-[0.2em] text-subtle">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-subtle sm:px-6">
          Data from SEC EDGAR. Not investment advice.
        </p>
      </div>
    </footer>
  );
}
