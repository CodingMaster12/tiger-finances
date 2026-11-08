import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <p className="bg-hot rounded-full px-4 py-1 font-display text-sm font-semibold tracking-[0.2em] text-on-accent">404</p>
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-[0.02em] sm:text-5xl">This page drifted off</h1>
      <p className="mt-4 max-w-[40ch] text-muted">The link may be old or mistyped. Here are the places that do exist.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="bg-hot inline-flex h-11 items-center rounded-md px-6 text-sm font-semibold text-on-accent shadow-glow">
          Go home
        </Link>
        <Link href="/numbers" className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-sm font-semibold hover:border-accent hover:text-brand">
          See the numbers
        </Link>
      </div>
    </div>
  );
}
