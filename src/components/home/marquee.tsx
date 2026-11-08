const items: { label: string; tone: string }[] = [
  { label: "Income statements", tone: "border-accent/50 bg-accent-soft text-brand" },
  { label: "Balance sheets", tone: "border-cyan/50 bg-cyan-soft text-cyan" },
  { label: "Cash flow", tone: "border-pink/50 bg-pink-soft text-pink" },
  { label: "SEC filings", tone: "border-violet/50 bg-violet-soft text-violet" },
  { label: "US + Canada", tone: "border-lining/50 bg-lining-soft text-lining" },
  { label: "Annual + quarterly", tone: "border-orange/50 bg-orange-soft text-orange" },
  { label: "Reported vs calculated", tone: "border-cyan/50 bg-cyan-soft text-cyan" },
  { label: "Currency kept honest", tone: "border-pink/50 bg-pink-soft text-pink" },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {items.map((i) => (
        <li key={i.label} className={`whitespace-nowrap rounded-full border px-5 py-2 font-display text-[13px] font-medium uppercase tracking-[0.14em] ${i.tone}`}>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** A slow scrolling strip of colourful pills. Pauses on hover; holds still for reduced motion. */
export function Marquee() {
  return (
    <div
      className="group overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-label="What Tiger Finances covers"
      role="group"
    >
      <div className="flex w-max [animation:marquee_46s_linear_infinite] group-hover:[animation-play-state:paused]">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
