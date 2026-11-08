/**
 * Period engine: turns raw SEC "company facts" rows into clean annual and quarterly points.
 * Pure functions only (no network, no clock), so everything here is unit-tested against saved real data.
 *
 * Rules that matter (learned from the real payloads):
 *  - The same fact is repeated by every filing that mentions it, so rows are de-duplicated per period.
 *  - `fy` / `fp` describe the FILING, not the period, so they are never used. Periods come from start/end dates.
 *  - 10-Q / 6-K flow values are often year-to-date, so single quarters are derived (and labelled "calculated").
 *  - Per-share values cannot be derived by subtraction, so they are only ever shown when directly reported.
 */
import type { ConceptRef, MetricDef, UnitType } from "./concepts";
import { companyFactsSchema, factRowSchema, SecError, type DataPoint, type FactRow } from "./types";

const DAY = 86_400_000;
export const daysBetween = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
export const addDays = (iso: string, n: number): string => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10);
const near = (a: string, b: string, tol = 7): boolean => Math.abs(daysBetween(a, b)) <= tol;

const UNIT_PATTERN: Record<UnitType, RegExp> = {
  money: /^[A-Z]{3}$/,
  perShare: /^[A-Z]{3}\/shares$/,
  shares: /^shares$/,
};

const ANNUAL_FORM = /^(10-K|20-F|40-F)(\/A)?$/;

export interface Candidate {
  row: FactRow;
  unit: string;
  concept: string; // "us-gaap:Revenues"
  priority: number; // index in the metric's concept list; lower wins
  total: boolean;
}

export interface FactsIndex {
  cik: number;
  entityName: string;
  /** Number of rows skipped because they did not match the expected shape. */
  droppedRows: () => number;
  /** Candidates for one metric across all its concepts, validated. */
  candidates: (metric: MetricDef) => Candidate[];
}

/** Validate the top-level payload and return a lazy reader. Throws SecError("invalid_data") on a bad shape. */
export function indexFacts(raw: unknown): FactsIndex {
  const parsed = companyFactsSchema.safeParse(raw);
  if (!parsed.success) throw new SecError("invalid_data", "SEC company facts did not have the expected shape.");
  const { cik, entityName, facts } = parsed.data;
  let dropped = 0;

  const read = (ref: ConceptRef, unitType: UnitType, priority: number): Candidate[] => {
    const entry = facts[ref.taxonomy]?.[ref.tag];
    if (!entry) return [];
    // Pick the unit with the most rows (a company can occasionally report in a second currency).
    const units = Object.keys(entry.units).filter((u) => UNIT_PATTERN[unitType].test(u));
    if (units.length === 0) return [];
    const unit = units.reduce((a, b) => (entry.units[b].length > entry.units[a].length ? b : a));
    const out: Candidate[] = [];
    for (const r of entry.units[unit]) {
      const p = factRowSchema.safeParse(r);
      if (!p.success) {
        dropped += 1;
        continue;
      }
      out.push({ row: p.data, unit, concept: `${ref.taxonomy}:${ref.tag}`, priority, total: Boolean(ref.total) });
    }
    return out;
  };

  return {
    cik,
    entityName,
    droppedRows: () => dropped,
    candidates: (metric) => metric.concepts.flatMap((ref, i) => read(ref, metric.unitType, i)),
  };
}

interface Best {
  c: Candidate;
  restated: boolean;
}

/** Among candidates for one period: best concept first, then the most recently filed row. */
function pickBest(cs: Candidate[]): Best {
  const minP = Math.min(...cs.map((c) => c.priority));
  const same = cs
    .filter((c) => c.priority === minP)
    .sort((a, b) => b.row.filed.localeCompare(a.row.filed) || b.row.accn.localeCompare(a.row.accn));
  return { c: same[0], restated: same.some((c) => c.row.val !== same[0].row.val) };
}

function groupBest(cands: Candidate[], keyOf: (c: Candidate) => string): Map<string, Best> {
  const groups = new Map<string, Candidate[]>();
  for (const c of cands) {
    const k = keyOf(c);
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }
  const out = new Map<string, Best>();
  for (const [k, g] of groups) out.set(k, pickBest(g));
  return out;
}

export function toPoint(b: Best, extra?: Partial<DataPoint>): DataPoint {
  const { c, restated } = b;
  return {
    value: c.row.val,
    unit: c.unit,
    periodStart: c.row.start ?? null,
    periodEnd: c.row.end,
    form: c.row.form,
    filed: c.row.filed,
    accession: c.row.accn,
    concept: c.concept,
    kind: "reported",
    ...(restated ? { restated: true } : {}),
    ...extra,
  };
}

// ---------------------------------------------------------------- flows (income statement, cash flow)

export interface FlowYear {
  fyStart: string;
  /** Null for the fiscal year still in progress (no annual filing yet). */
  fyEnd: string | null;
  annual: DataPoint | null;
  quarters: Map<1 | 2 | 3 | 4, DataPoint>;
}

type Span = "3M" | "6M" | "9M" | "12M";

function spanOf(r: FactRow): Span | null {
  if (!r.start) return null;
  const d = daysBetween(r.start, r.end);
  if (d >= 80 && d <= 100) return "3M";
  if (d >= 170 && d <= 200) return "6M";
  if (d >= 260 && d <= 290) return "9M";
  if (d >= 350 && d <= 380) return ANNUAL_FORM.test(r.form) ? "12M" : null;
  return null;
}

function difference(later: Best, earlier: Best, note: string, periodStart: string | null): DataPoint {
  return toPoint(later, {
    value: later.c.row.val - earlier.c.row.val,
    periodStart,
    kind: "calculated",
    note,
    restated: later.restated || earlier.restated || undefined,
  });
}

/**
 * Builds fiscal years with annual and single-quarter points for one flow metric.
 * `allowDerive` must be false for per-share metrics (EPS for a year is not the sum of its quarters).
 */
export function flowYears(cands: Candidate[], allowDerive: boolean): FlowYear[] {
  const best = groupBest(
    cands.filter((c) => spanOf(c.row) !== null),
    (c) => `${c.row.start}|${c.row.end}`,
  );
  const bySpan: Record<Span, Best[]> = { "3M": [], "6M": [], "9M": [], "12M": [] };
  for (const b of best.values()) bySpan[spanOf(b.c.row)!].push(b);
  const byEnd = (a: Best, b: Best) => a.c.row.end.localeCompare(b.c.row.end);
  for (const k of Object.keys(bySpan) as Span[]) bySpan[k].sort(byEnd);

  const blocks: { start: string; end: string | null; fy: Best | null }[] = bySpan["12M"].map((b) => ({
    start: b.c.row.start!,
    end: b.c.row.end,
    fy: b,
  }));
  // The year in progress: interim rows that start right after the last annual period.
  const lastEnd = blocks.length ? blocks[blocks.length - 1].end! : null;
  if (lastEnd) {
    const nextStart = addDays(lastEnd, 1);
    const interim = [...bySpan["3M"], ...bySpan["6M"], ...bySpan["9M"]];
    if (interim.some((b) => near(b.c.row.start!, nextStart))) blocks.push({ start: nextStart, end: null, fy: null });
  }

  return blocks.map(({ start, end, fy }) => {
    const direct = new Map<number, Best>();
    for (const b of bySpan["3M"]) {
      const days = daysBetween(start, b.c.row.end);
      const q = Math.round(days / 91.31);
      if (q < 1 || q > 4 || Math.abs(days - q * 91.31) > 15) continue;
      if (end && daysBetween(end, b.c.row.end) > 7) continue;
      direct.set(q, b);
    }
    const ytd = (span: "6M" | "9M") => bySpan[span].find((b) => near(b.c.row.start!, start)) ?? null;
    const ytd6 = ytd("6M");
    const ytd9 = ytd("9M");

    const quarters = new Map<1 | 2 | 3 | 4, DataPoint>();
    const set = (q: 1 | 2 | 3 | 4, p: DataPoint | null) => p && quarters.set(q, p);
    const d1 = direct.get(1);
    const d2 = direct.get(2);
    const d3 = direct.get(3);
    const d4 = direct.get(4);
    set(1, d1 ? toPoint(d1) : null);
    set(2, d2 ? toPoint(d2) : allowDerive && ytd6 && d1 ? difference(ytd6, d1, "Derived: 6-month total minus first quarter.", addDays(d1.c.row.end, 1)) : null);
    set(3, d3 ? toPoint(d3) : allowDerive && ytd9 && ytd6 ? difference(ytd9, ytd6, "Derived: 9-month total minus 6-month total.", addDays(ytd6.c.row.end, 1)) : null);
    set(4, d4 ? toPoint(d4) : allowDerive && fy && ytd9 ? difference(fy, ytd9, "Derived: full-year total minus 9-month total.", addDays(ytd9.c.row.end, 1)) : null);

    return { fyStart: start, fyEnd: end, annual: fy ? toPoint(fy) : null, quarters };
  });
}

// ---------------------------------------------------------------- instants (balance sheet)

export type InstantMap = Map<string, Best>;

export function instantMap(cands: Candidate[]): InstantMap {
  return groupBest(
    cands.filter((c) => !c.row.start),
    (c) => c.row.end,
  );
}

/** Value at a date, allowing a few days of slack for 52/53-week fiscal calendars. */
export function instantNear(map: InstantMap, end: string, tol = 7): DataPoint | null {
  const exact = map.get(end);
  if (exact) return toPoint(exact);
  let found: Best | null = null;
  let gap = tol + 1;
  for (const [e, b] of map) {
    const g = Math.abs(daysBetween(e, end));
    if (g < gap) {
      gap = g;
      found = b;
    }
  }
  return found ? toPoint(found) : null;
}

/** Group dates that are within `gap` days of their predecessor; each group is represented by its latest date. */
export function clusterDates(dates: string[], gap = 10): string[] {
  const sorted = [...new Set(dates)].sort();
  const out: string[] = [];
  for (const d of sorted) {
    if (out.length && daysBetween(out[out.length - 1], d) <= gap) out[out.length - 1] = d;
    else out.push(d);
  }
  return out;
}
