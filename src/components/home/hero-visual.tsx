/**
 * Decorative home visual: a glowing gold cube among translucent pillars, drawn as isometric SVG.
 * Purely decorative (aria-hidden): it carries no data, no labels and no numbers, and must never be
 * read as a chart. Particle positions come from a fixed seed so server and client render identically.
 */

const U = 36; // pixels per grid unit
const OX = 330;
const OY = 262;
const COS = 0.866 * U;
const SIN = 0.5 * U;

type P = [number, number];
const iso = (x: number, y: number, z: number): P => [OX + (x - y) * COS, OY + (x + y) * SIN - z * U];
const pts = (ps: P[]) => ps.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

interface Box {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}

function faces({ x, y, w, d, h }: Box) {
  return {
    top: pts([iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h)]),
    left: pts([iso(x, y + d, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x, y + d, 0)]),
    right: pts([iso(x + w, y, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x + w, y, 0)]),
  };
}

const pillars: Box[] = [
  { x: 0.2, y: 0.4, w: 1, d: 1, h: 5.4 },
  { x: 2.6, y: -0.8, w: 1.1, d: 1.1, h: 7.2 },
  { x: 6.2, y: -0.2, w: 1, d: 1, h: 4.4 },
  { x: 8.4, y: 2.2, w: 0.9, d: 0.9, h: 3.4 },
  { x: -1.4, y: 3.4, w: 0.9, d: 0.9, h: 3.6 },
  { x: 0.8, y: 6.6, w: 1, d: 1, h: 2.4 },
  { x: 8.6, y: 6.2, w: 0.9, d: 0.9, h: 2.1 },
  { x: 5.2, y: 8.2, w: 1, d: 1, h: 3.1 },
  { x: 3.0, y: 9.2, w: 0.8, d: 0.8, h: 1.6 },
];
const cube: Box = { x: 3.3, y: 3.3, w: 2.8, d: 2.8, h: 2.8 };

// Painter's order: farther boxes first, then the cube, then boxes in front of it.
const centre = (b: Box) => b.x + b.y + (b.w + b.d) / 2;
const behind = pillars.filter((b) => centre(b) < centre(cube)).sort((a, b) => centre(a) - centre(b));
const inFront = pillars.filter((b) => centre(b) >= centre(cube)).sort((a, b) => centre(a) - centre(b));

// Deterministic pseudo-random numbers (no Math.random, so no hydration mismatch).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Particle {
  cx: number;
  cy: number;
  r: number;
  o: number;
  gold: boolean;
  twinkle: boolean;
  delay: number;
}

function makeParticles(): Particle[] {
  const r = rng(20261108);
  const out: Particle[] = [];
  // Drifting dust around the whole scene.
  for (let i = 0; i < 90; i++) {
    const [cx, cy] = iso(-2 + r() * 12.5, -1.5 + r() * 12, r() * 7.5);
    out.push({ cx, cy, r: 0.5 + r() * 1.1, o: 0.2 + r() * 0.55, gold: r() > 0.55, twinkle: r() > 0.7, delay: r() * 6 });
  }
  // Dense glittering inside the cube.
  for (let i = 0; i < 70; i++) {
    const [cx, cy] = iso(cube.x + r() * cube.w, cube.y + r() * cube.d, r() * cube.h);
    out.push({ cx, cy, r: 0.6 + r() * 1.3, o: 0.45 + r() * 0.5, gold: true, twinkle: r() > 0.6, delay: r() * 6 });
  }
  return out;
}
const particles = makeParticles();

const gridLines = (() => {
  const lines: { a: P; b: P }[] = [];
  for (let i = -2; i <= 11; i++) {
    lines.push({ a: iso(i, -2, 0), b: iso(i, 11, 0) });
    lines.push({ a: iso(-2, i, 0), b: iso(11, i, 0) });
  }
  return lines;
})();

function Pillar({ box, id }: { box: Box; id: string }) {
  const f = faces(box);
  return (
    <g key={id} stroke="rgb(244 238 225 / 0.38)" strokeWidth="0.8" strokeLinejoin="round">
      <polygon points={f.left} fill="url(#glass-left)" />
      <polygon points={f.right} fill="url(#glass-right)" />
      <polygon points={f.top} fill="rgb(244 238 225 / 0.14)" />
    </g>
  );
}

export function HeroVisual({ className }: { className?: string }) {
  const c = faces(cube);
  const base = iso(cube.x + cube.w / 2, cube.y + cube.d / 2, 0);
  return (
    <svg
      viewBox="0 0 660 560"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <defs>
        <radialGradient id="floor-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f08a3c" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#e9b43f" stopOpacity="0.16" />
          <stop offset="1" stopColor="#e9b43f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="grid-fade" cx="50%" cy="48%" r="55%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="grid-mask">
          <rect width="660" height="560" fill="url(#grid-fade)" />
        </mask>
        <linearGradient id="glass-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4eee1" stopOpacity="0.16" />
          <stop offset="1" stopColor="#f4eee1" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="glass-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4eee1" stopOpacity="0.07" />
          <stop offset="1" stopColor="#f4eee1" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="cube-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe19a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f5c962" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="cube-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2b94a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c97a2a" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="cube-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8923a" stopOpacity="0.42" />
          <stop offset="1" stopColor="#9a5a22" stopOpacity="0.14" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Floor grid, fading out toward the edges. */}
      <g mask="url(#grid-mask)" stroke="#e9b43f" strokeOpacity="0.16" strokeWidth="0.7" fill="none">
        {gridLines.map((l, i) => (
          <line key={i} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} />
        ))}
      </g>

      {/* Glow pooled on the floor under the cube. */}
      <ellipse cx={base[0]} cy={base[1] + 6} rx="190" ry="78" fill="url(#floor-glow)" />

      {behind.map((b, i) => (
        <Pillar key={`b${i}`} id={`b${i}`} box={b} />
      ))}

      {/* The cube: soft bloom behind, faces, bright edges. */}
      <g>
        <polygon points={c.top} fill="#f08a3c" opacity="0.5" filter="url(#soft)" />
        <polygon points={c.left} fill="url(#cube-left)" />
        <polygon points={c.right} fill="url(#cube-right)" />
        <polygon points={c.top} fill="url(#cube-top)" />
        <g fill="none" stroke="#f9d27a" strokeWidth="1.5" strokeLinejoin="round">
          <polygon points={c.top} />
          <polyline points={pts([iso(cube.x, cube.y + cube.d, cube.h), iso(cube.x, cube.y + cube.d, 0), iso(cube.x + cube.w, cube.y + cube.d, 0), iso(cube.x + cube.w, cube.y, 0), iso(cube.x + cube.w, cube.y, cube.h)])} />
          <line x1={iso(cube.x + cube.w, cube.y + cube.d, cube.h)[0]} y1={iso(cube.x + cube.w, cube.y + cube.d, cube.h)[1]} x2={iso(cube.x + cube.w, cube.y + cube.d, 0)[0]} y2={iso(cube.x + cube.w, cube.y + cube.d, 0)[1]} />
        </g>
      </g>

      {inFront.map((b, i) => (
        <Pillar key={`f${i}`} id={`f${i}`} box={b} />
      ))}

      {/* Particles. */}
      <g>
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.cx.toFixed(1)}
            cy={p.cy.toFixed(1)}
            r={p.r.toFixed(2)}
            fill={p.gold ? "#f9d27a" : "#f4eee1"}
            opacity={p.o}
            style={
              p.twinkle
                ? ({ "--o": p.o, animation: `twinkle ${4 + (i % 5)}s ease-in-out ${p.delay.toFixed(1)}s infinite` } as React.CSSProperties)
                : undefined
            }
          />
        ))}
      </g>
    </svg>
  );
}
