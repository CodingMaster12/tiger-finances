import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CompareArt, OrbitArt, TraceArt, WorkspaceArt } from "@/components/home/bento-art";
import { HeroScene } from "@/components/home/hero-scene";
import { Marquee } from "@/components/home/marquee";

interface Tile {
  title: string;
  line: string;
  chip: string;
  chipTone: string;
  href: string;
  cta: string;
  art: ReactNode;
  span: string;
  surface: string;
}

const tiles: Tile[] = [
  {
    title: "Traced to the filing",
    line: "Every figure shows its source, period and currency.",
    chip: "Live",
    chipTone: "bg-lining-soft text-lining",
    href: "/numbers",
    cta: "See real statements",
    art: <TraceArt />,
    span: "md:col-span-2",
    surface: "from-violet-soft/40 to-surface",
  },
  {
    title: "Side by side",
    line: "Compare companies in one view.",
    chip: "Coming soon",
    chipTone: "bg-violet-soft text-violet",
    href: "/numbers",
    cta: "Start with the numbers",
    art: <CompareArt />,
    span: "",
    surface: "from-cyan-soft/40 to-surface",
  },
  {
    title: "Your workspace",
    line: "Create an account, save your place, come back anywhere.",
    chip: "Accounts live",
    chipTone: "bg-accent-soft text-brand",
    href: "/register",
    cta: "Create account",
    art: <WorkspaceArt />,
    span: "",
    surface: "from-accent-soft/45 to-surface",
  },
  {
    title: "US and Canada",
    line: "Companies that file with the SEC, on both sides of the border.",
    chip: "Live",
    chipTone: "bg-lining-soft text-lining",
    href: "/numbers",
    cta: "See Apple and Royal Bank",
    art: <OrbitArt />,
    span: "md:col-span-2",
    surface: "from-lining-soft/40 to-surface",
  },
];

export default function Home() {
  return (
    <div className="space-y-16 lg:space-y-24">
      <section aria-labelledby="home-title" className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="py-4 lg:py-10">
          <h1
            id="home-title"
            className="font-display text-[clamp(2.6rem,6.2vw,5.4rem)] font-semibold uppercase leading-[1.04] tracking-[0.015em] text-text"
          >
            Every number,
            <span className="mt-3 block">
              <span className="bg-hot inline-block rounded-md px-3 pb-1 pt-0.5 text-on-accent">traced.</span>
            </span>
          </h1>
          <p className="mt-6 max-w-[34ch] text-balance text-lg text-muted">Company financials from SEC filings, with the receipts.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/numbers"
              className="bg-hot inline-flex h-12 items-center gap-2 rounded-md px-7 text-[15px] font-semibold text-on-accent shadow-glow transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-110"
            >
              Explore the numbers <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md border border-border-strong bg-surface/60 px-7 text-[15px] font-semibold text-text transition-colors hover:border-accent hover:text-brand"
            >
              Create account
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-xs font-semibold">
            <li className="rounded-full bg-cyan-soft px-3 py-1 text-cyan">SEC filings</li>
            <li className="rounded-full bg-violet-soft px-3 py-1 text-violet">US + Canada</li>
            <li className="rounded-full bg-surface-2 px-3 py-1 text-muted">No prices yet</li>
          </ul>
        </div>
        <HeroScene className="mx-auto w-full max-w-[680px] lg:max-w-none" />
      </section>

      <div className="-mx-4 sm:-mx-6">
        <Marquee />
      </div>

      <section aria-labelledby="tiles-title">
        <h2 id="tiles-title" className="sr-only">What you can do</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-gradient-to-br ${t.surface} ${t.span} transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-border-strong`}
            >
              <div className="h-56 px-4 pt-4">{t.art}</div>
              <div className="flex flex-1 flex-col gap-3 p-6 pt-3">
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${t.chipTone}`}>{t.chip}</span>
                <h3 className="font-display text-2xl font-semibold tracking-[0.01em]">{t.title}</h3>
                <p className="max-w-[40ch] text-sm text-muted">{t.line}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
                  {t.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="cta-title"
        className="relative overflow-hidden rounded-2xl px-6 py-12 text-center text-on-accent sm:px-12"
        style={{ backgroundImage: "linear-gradient(100deg, #f6c85a 0%, #f2a94a 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 size-64 rounded-full bg-[#fff3b8]/20 blur-3xl" style={{ animation: "blob 12s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 size-72 rounded-full bg-[#ffd98a]/25 blur-3xl" style={{ animation: "blob 15s ease-in-out -5s infinite" }} />
        <h2 id="cta-title" className="relative font-display text-4xl font-semibold tracking-[0.01em] sm:text-5xl">Start tracing.</h2>
        <p className="relative mx-auto mt-3 max-w-[36ch] text-base font-medium">A free account keeps your place across devices.</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="inline-flex h-12 items-center rounded-md bg-bg px-7 text-[15px] font-semibold text-text shadow-md transition-transform hover:-translate-y-0.5">
            Create account
          </Link>
          <Link href="/numbers" className="inline-flex h-12 items-center rounded-md border-2 border-on-accent/70 px-7 text-[15px] font-semibold transition-colors hover:bg-on-accent/10">
            See the numbers
          </Link>
        </div>
      </section>
    </div>
  );
}
