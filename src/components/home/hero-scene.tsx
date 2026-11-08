"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";

/**
 * Animated home scene: drifting colour blobs, an isometric skyline of breathing pillars, a floating
 * multi-colour cube with orbiting rings, rising sparks and a pulsing floor grid. Purely decorative and
 * aria-hidden: no data, no labels, no numbers; it must never be read as a chart. Pointer movement nudges
 * the layers for depth. All motion stops under prefers-reduced-motion (see globals.css).
 */
const U = 36;
const OX = 330;
const OY = 262;
const COS = 0.866 * U;
const SIN = 0.5 * U;

type P = [number, number];
const iso = (x: number, y: number, z: number): P => [OX + (x - y) * COS, OY + (x + y) * SIN - z * U];
const pts = (ps: P[]) => ps.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

interface Box { x: number; y: number; w: number; d: number; h: number; hue: keyof typeof HUES }
const HUES = {
  cyan: ["#2fd6ff", "#1a6fd6"],
  violet: ["#a584ff", "#5a2fd6"],
  pink: ["#ff4f9a", "#b01c6a"],
  gold: ["#ffc247", "#ff8a3d"],
  emerald: ["#3ee0a0", "#14907a"],
} as const;

const pillars: Box[] = [
  { x: 0.2, y: 0.4, w: 1, d: 1, h: 5.4, hue: "violet" },
  { x: 2.6, y: -0.8, w: 1.1, d: 1.1, h: 7.2, hue: "cyan" },
  { x: 6.2, y: -0.2, w: 1, d: 1, h: 4.4, hue: "pink" },
  { x: 8.4, y: 2.2, w: 0.9, d: 0.9, h: 3.4, hue: "emerald" },
  { x: -1.4, y: 3.4, w: 0.9, d: 0.9, h: 3.6, hue: "gold" },
  { x: 0.8, y: 6.6, w: 1, d: 1, h: 2.4, hue: "cyan" },
  { x: 8.6, y: 6.2, w: 0.9, d: 0.9, h: 2.1, hue: "violet" },
  { x: 5.2, y: 8.2, w: 1, d: 1, h: 3.1, hue: "pink" },
  { x: 3.0, y: 9.2, w: 0.8, d: 0.8, h: 1.6, hue: "emerald" },
];
const cube = { x: 3.3, y: 3.3, w: 2.8, d: 2.8, h: 2.8 };

const faces = ({ x, y, w, d, h }: { x: number; y: number; w: number; d: number; h: number }) => ({
  top: pts([iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h)]),
  left: pts([iso(x, y + d, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x, y + d, 0)]),
  right: pts([iso(x + w, y, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x + w, y, 0)]),
});

const centre = (b: { x: number; y: number; w: number; d: number }) => b.x + b.y + (b.w + b.d) / 2;
const behind = pillars.filter((b) => centre(b) < centre(cube)).sort((a, b) => centre(a) - centre(b));
const inFront = pillars.filter((b) => centre(b) >= centre(cube)).sort((a, b) => centre(a) - centre(b));

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const SPARK_COLORS = ["#ffd36f", "#ff4f9a", "#2fd6ff", "#a584ff", "#f6f3ff", "#3ee0a0"];
const sparks = (() => {
  const r = rng(20261108);
  return Array.from({ length: 46 }, (_, i) => {
    const [cx, cy] = iso(-2 + r() * 12.5, -1 + r() * 11, r() * 5);
    return { cx, cy, r: 0.8 + r() * 1.8, o: 0.5 + r() * 0.5, c: SPARK_COLORS[i % SPARK_COLORS.length], dur: 5 + r() * 7, delay: -r() * 10 };
  });
})();
const gridLines = (() => {
  const lines: { a: P; b: P; hot: boolean }[] = [];
  for (let i = -2; i <= 11; i++) {
    lines.push({ a: iso(i, -2, 0), b: iso(i, 11, 0), hot: i % 4 === 0 });
    lines.push({ a: iso(-2, i, 0), b: iso(11, i, 0), hot: false });
  }
  return lines;
})();

function Pillar({ box, index }: { box: Box; index: number }) {
  const f = faces(box);
  const [c1] = HUES[box.hue];
  const style: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 100%",
    animation: `breathe ${5 + (index % 4)}s ease-in-out ${-index * 0.9}s infinite`,
  };
  return (
    <g style={style} stroke={c1} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round">
      <polygon points={f.left} fill={`url(#pl-${box.hue})`} />
      <polygon points={f.right} fill={`url(#pr-${box.hue})`} />
      <polygon points={f.top} fill={c1} fillOpacity="0.85" />
    </g>
  );
}

function Ring({ rx, tilt, color, dur, reverse }: { rx: number; tilt: number; color: string; dur: number; reverse?: boolean }) {
  const [cx, cy] = iso(cube.x + cube.w / 2, cube.y + cube.d / 2, cube.h / 2);
  return (
    <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${tilt}) scale(1 0.34)`}>
      <g style={{ animation: `spin ${dur}s linear infinite ${reverse ? "reverse" : ""}` }}>
        <circle r={rx} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="3 9" />
        <circle cx={rx} r="7" fill={color} />
        <circle cx={rx} r="16" fill={color} fillOpacity="0.25" />
      </g>
    </g>
  );
}

export function HeroScene({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const onLeave = () => {
    root.current?.style.setProperty("--px", "0");
    root.current?.style.setProperty("--py", "0");
  };
  const layer = (x: number, y: number): CSSProperties => ({
    transform: `translate3d(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px), 0)`,
    transition: "transform 0.4s ease-out",
  });
  const c = faces(cube);
  const base = iso(cube.x + cube.w / 2, cube.y + cube.d / 2, 0);

  return (
    <div ref={root} onPointerMove={onMove} onPointerLeave={onLeave} className={`relative isolate ${className ?? ""}`} aria-hidden="true">
      {/* Colour blobs. */}
      <div style={layer(-18, -12)} className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[10%] size-[46%] rounded-full bg-[#ffc247]/35 blur-3xl" style={{ animation: "blob 13s ease-in-out infinite" }} />
        <div className="absolute right-[4%] top-[4%] size-[44%] rounded-full bg-[#a584ff]/45 blur-3xl" style={{ animation: "blob 16s ease-in-out -4s infinite" }} />
        <div className="absolute bottom-[6%] left-[16%] size-[42%] rounded-full bg-[#ff4f9a]/40 blur-3xl" style={{ animation: "blob 18s ease-in-out -8s infinite" }} />
        <div className="absolute bottom-[10%] right-[10%] size-[40%] rounded-full bg-[#2fd6ff]/35 blur-3xl" style={{ animation: "blob 15s ease-in-out -2s infinite" }} />
      </div>

      <div style={layer(14, 9)}>
        <svg viewBox="0 0 660 560" className="block h-auto w-full" focusable="false" role="presentation">
          <defs>
            {Object.entries(HUES).map(([name, [a, b]]) => (
              <g key={name}>
                <linearGradient id={`pl-${name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={a} stopOpacity="0.62" />
                  <stop offset="1" stopColor={b} stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id={`pr-${name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={b} stopOpacity="0.55" />
                  <stop offset="1" stopColor={b} stopOpacity="0.05" />
                </linearGradient>
              </g>
            ))}
            <radialGradient id="floor-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#ff4f9a" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#ffc247" stopOpacity="0.2" />
              <stop offset="1" stopColor="#ffc247" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grid-fade" cx="50%" cy="50%" r="55%">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="grid-mask"><rect width="660" height="560" fill="url(#grid-fade)" /></mask>
            <linearGradient id="cube-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff3b8" /><stop offset="1" stopColor="#ffc247" />
            </linearGradient>
            <linearGradient id="cube-left" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb02e" /><stop offset="1" stopColor="#ff6a3d" />
            </linearGradient>
            <linearGradient id="cube-right" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff4f9a" /><stop offset="1" stopColor="#7a3df0" />
            </linearGradient>
            <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16" /></filter>
          </defs>

          <g mask="url(#grid-mask)" fill="none">
            {gridLines.map((l, i) => (
              <line key={i} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={l.hot ? "#2fd6ff" : "#a584ff"} strokeOpacity={l.hot ? 0.6 : 0.22} strokeWidth="0.9"
                strokeDasharray={l.hot ? "6 14" : undefined} style={l.hot ? { animation: "dash-flow 3s linear infinite" } : undefined} />
            ))}
          </g>

          <ellipse cx={base[0]} cy={base[1] + 8} rx="210" ry="86" fill="url(#floor-glow)" />

          {behind.map((b, i) => <Pillar key={`b${i}`} box={b} index={i} />)}

          <Ring rx={190} tilt={-14} color="#2fd6ff" dur={16} />
          <g style={{ animation: "float 6s ease-in-out infinite" }}>
            <polygon points={c.top} fill="#ff4f9a" opacity="0.65" filter="url(#soft)" />
            <polygon points={c.left} fill="url(#cube-left)" />
            <polygon points={c.right} fill="url(#cube-right)" />
            <polygon points={c.top} fill="url(#cube-top)" />
            <g fill="none" stroke="#fff3b8" strokeWidth="1.6" strokeLinejoin="round">
              <polygon points={c.top} />
              <polyline points={pts([iso(cube.x, cube.y + cube.d, cube.h), iso(cube.x, cube.y + cube.d, 0), iso(cube.x + cube.w, cube.y + cube.d, 0), iso(cube.x + cube.w, cube.y, 0), iso(cube.x + cube.w, cube.y, cube.h)])} />
              <line x1={iso(cube.x + cube.w, cube.y + cube.d, cube.h)[0]} y1={iso(cube.x + cube.w, cube.y + cube.d, cube.h)[1]} x2={iso(cube.x + cube.w, cube.y + cube.d, 0)[0]} y2={iso(cube.x + cube.w, cube.y + cube.d, 0)[1]} />
            </g>
          </g>
          <Ring rx={150} tilt={22} color="#ff4f9a" dur={11} reverse />

          {inFront.map((b, i) => <Pillar key={`f${i}`} box={b} index={i + behind.length} />)}

          <g>
            {sparks.map((p, i) => (
              <circle key={i} cx={p.cx.toFixed(1)} cy={p.cy.toFixed(1)} r={p.r.toFixed(2)} fill={p.c}
                style={{ ["--o" as string]: p.o, animation: `rise ${p.dur.toFixed(1)}s linear ${p.delay.toFixed(1)}s infinite` } as CSSProperties} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
