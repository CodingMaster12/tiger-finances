import type { CSSProperties } from "react";

/** Decorative animated illustrations for the home tiles. aria-hidden: no data, labels or numbers. */
const svgProps = { viewBox: "0 0 360 170", className: "block h-full w-full", "aria-hidden": true, focusable: false, role: "presentation" } as const;
const anim = (name: string, dur: number, delay = 0, extra = ""): CSSProperties => ({ animation: `${name} ${dur}s ${extra || "ease-in-out"} ${delay}s infinite` });

/** A number flowing along a dashed path into a filing. */
export function TraceArt() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="trace-line" x1="0" x2="1">
          <stop offset="0" stopColor="#ffc247" /><stop offset="0.5" stopColor="#ff4f9a" /><stop offset="1" stopColor="#a584ff" />
        </linearGradient>
      </defs>
      <path d="M70 85 C 130 20, 190 150, 270 85" fill="none" stroke="url(#trace-line)" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 12" style={anim("dash-flow", 2.2, 0, "linear")} />
      <path d="M70 85 C 130 20, 190 150, 270 85" fill="none" stroke="url(#trace-line)" strokeOpacity="0.25" strokeWidth="9" strokeLinecap="round" />
      <g style={anim("float", 5)}>
        <rect x="22" y="62" width="64" height="46" rx="12" fill="#ffc247" />
        <rect x="34" y="78" width="40" height="6" rx="3" fill="#1a1004" opacity="0.55" />
        <rect x="34" y="90" width="26" height="6" rx="3" fill="#1a1004" opacity="0.35" />
      </g>
      <g style={anim("float", 6, -2)}>
        <rect x="262" y="40" width="68" height="90" rx="10" fill="#f6f3ff" fillOpacity="0.1" stroke="#f6f3ff" strokeOpacity="0.6" />
        <rect x="274" y="56" width="44" height="5" rx="2.5" fill="#f6f3ff" opacity="0.7" />
        <rect x="274" y="70" width="34" height="5" rx="2.5" fill="#f6f3ff" opacity="0.45" />
        <rect x="274" y="84" width="40" height="5" rx="2.5" fill="#f6f3ff" opacity="0.45" />
        <circle cx="318" cy="118" r="9" fill="#3ee0a0" />
        <path d="M313.5 118 l3 3 l5-6" fill="none" stroke="#08050f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Two waves crossing: one thing set beside another. */
export function CompareArt() {
  return (
    <svg {...svgProps}>
      <path d="M0 100 C 50 40, 100 150, 160 90 S 280 40, 360 100" fill="none" stroke="#2fd6ff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="10 8" style={anim("dash-flow", 3, 0, "linear")} />
      <path d="M0 80 C 60 140, 110 30, 180 90 S 290 140, 360 70" fill="none" stroke="#ff4f9a" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="10 8" style={anim("dash-flow", 3.6, -1, "linear")} />
      <g style={anim("float", 4)}><circle cx="95" cy="94" r="7" fill="#2fd6ff" /><circle cx="95" cy="94" r="16" fill="#2fd6ff" fillOpacity="0.25" /></g>
      <g style={anim("float", 5, -1.5)}><circle cx="255" cy="86" r="7" fill="#ff4f9a" /><circle cx="255" cy="86" r="16" fill="#ff4f9a" fillOpacity="0.25" /></g>
    </svg>
  );
}

/** Floating layers: a personal space. */
export function WorkspaceArt() {
  const layers = [
    { y: 112, c: "#a584ff", d: 0 },
    { y: 70, c: "#ff4f9a", d: -1.4 },
    { y: 28, c: "#ffc247", d: -2.8 },
  ];
  return (
    <svg {...svgProps}>
      {layers.map((l) => (
        <g key={l.c} style={anim("float", 5, l.d)}>
          <rect x="86" y={l.y} width="188" height="40" rx="12" fill={l.c} fillOpacity="0.18" stroke={l.c} strokeWidth="1.8" />
          <rect x="104" y={l.y + 13} width="70" height="6" rx="3" fill={l.c} />
          <rect x="104" y={l.y + 25} width="44" height="5" rx="2.5" fill={l.c} opacity="0.55" />
        </g>
      ))}
    </svg>
  );
}

/** Two rings with a marker each: two sides of a border. */
export function OrbitArt() {
  return (
    <svg {...svgProps}>
      <g transform="translate(180 85)">
        <circle r="30" fill="#3ee0a0" fillOpacity="0.18" style={anim("float", 4)} />
        <circle r="18" fill="#3ee0a0" />
        <g transform="scale(1 0.42)">
          <g style={anim("spin", 14, 0, "linear")}>
            <circle r="118" fill="none" stroke="#2fd6ff" strokeOpacity="0.8" strokeWidth="2.4" strokeDasharray="4 8" />
            <circle cx="118" r="15" fill="#2fd6ff" />
            <circle cx="118" r="30" fill="#2fd6ff" fillOpacity="0.25" />
          </g>
          <g style={anim("spin", 20, 0, "linear reverse")}>
            <circle r="164" fill="none" stroke="#ffc247" strokeOpacity="0.75" strokeWidth="2.4" strokeDasharray="4 8" />
            <circle cx="164" r="15" fill="#ffc247" />
            <circle cx="164" r="30" fill="#ffc247" fillOpacity="0.25" />
          </g>
        </g>
      </g>
    </svg>
  );
}
