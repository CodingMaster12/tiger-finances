const items: { label: string; tone: string }[] = [
  { label: "Income statements", tone: "border-accent/40 bg-accent-soft/70 text-brand" },
  { label: "Balance sheets", tone: "border-cyan/40 bg-cyan-soft/70 text-cyan" },
  { label: "Cash flow", tone: "border-violet/40 bg-violet-soft/70 text-violet" },
  { label: "SEC filings", tone: "border-accent/40 bg-accent-soft/70 text-brand" },
  { label: "US + Canada", tone: "border-lining/40 bg-lining-soft/70 text-lining" },
  { label: "Annual + quarterly", tone: "border-cyan/40 bg-cyan-soft/70 text-cyan" },
  { label: "Reported vs calculated", tone: "border-violet/40 bg-violet-soft/70 text-violet" },
  { label: "Currency kept honest", tone: "border-lining/40 bg-lining-soft/70 text-lining" },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {items.map((i) => (
        <li key={i.label} className={`whitespace-nowrap rounded-full border px-5 py-2 font-display text-[13px] font-medium uppercase tracking-[0.12em] ${i.tone}`}>
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
      <div className="flex w-max [animation:marquee_80s_linear_infinite] group-hover:[animation-play-state:paused]">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
