import { z } from "zod";

/** Source label shown next to every number. */
export const SOURCE_NAME = "SEC EDGAR";

export type SecErrorCode =
  | "config" // SEC_USER_AGENT missing in production
  | "not_found" // CIK unknown to the SEC
  | "not_covered" // company is not an SEC filer / has no XBRL financial data
  | "rate_limited" // SEC throttled us and no cached copy exists
  | "upstream" // SEC returned an unexpected status or the network failed
  | "invalid_data"; // payload did not match the expected shape

export class SecError extends Error {
  constructor(
    public readonly code: SecErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SecError";
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** One reported fact row as found in the SEC companyfacts payload. */
export const factRowSchema = z.object({
  start: isoDate.optional(),
  end: isoDate,
  val: z.number(),
  accn: z.string(),
  form: z.string(),
  filed: isoDate,
});
export type FactRow = z.infer<typeof factRowSchema>;

/** Shallow shape check only; rows are validated lazily, per concept we actually read. */
export const companyFactsSchema = z.object({
  cik: z.number(),
  entityName: z.string(),
  facts: z.record(
    z.string(),
    z.record(z.string(), z.object({ units: z.record(z.string(), z.array(z.unknown())) })),
  ),
});

/** Subset of the SEC submissions payload we use. Unknown fields are ignored. */
export const submissionsSchema = z.object({
  cik: z.string(),
  name: z.string(),
  tickers: z.array(z.string()).default([]),
  exchanges: z.array(z.string()).default([]),
  sic: z.string().nullish(),
  sicDescription: z.string().nullish(),
  fiscalYearEnd: z.string().nullish(),
  stateOfIncorporation: z.string().nullish(),
});

export interface CompanyProfile {
  cik: string; // 10 digits, zero padded
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string | null;
  industry: string | null; // SIC description
  /** "MMDD", e.g. "0926" */
  fiscalYearEnd: string | null;
  isFinancial: boolean;
}

/** A single number with full provenance. */
export interface DataPoint {
  value: number;
  unit: string; // "USD", "CAD", "USD/shares", "shares"
  periodStart: string | null;
  periodEnd: string;
  form: string;
  filed: string;
  accession: string;
  concept: string; // e.g. "us-gaap:Revenues"
  kind: "reported" | "calculated";
  /** Plain-language explanation for calculated values. */
  note?: string;
  /** True when a later filing reported a different value for the same period. */
  restated?: boolean;
}

export type FiscalPeriod = "FY" | "Q1" | "Q2" | "Q3" | "Q4";

export interface PeriodColumn {
  periodEnd: string;
  fiscalPeriod: FiscalPeriod;
}

export interface StatementRow {
  key: string;
  label: string;
  unitType: "money" | "perShare" | "shares";
  /** Aligned with the statement's columns; null means "not available". */
  values: (DataPoint | null)[];
}

export interface Statement {
  id: "income" | "balance" | "cashflow";
  title: string;
  columns: PeriodColumn[];
  rows: StatementRow[];
}

export interface FinancialsView {
  statements: Statement[];
}

export interface CompanyFinancials {
  company: CompanyProfile;
  /** Dominant reporting currency, or null if no money values were found. */
  currency: string | null;
  accountingStandard: "us-gaap" | "ifrs-full" | "unknown";
  annual: FinancialsView;
  quarterly: FinancialsView;
  source: { name: typeof SOURCE_NAME; url: string; retrievedAt: string };
  /** Honest, human-readable limits that apply to this company. */
  notes: string[];
}
