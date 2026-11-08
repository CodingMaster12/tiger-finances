import aaplFacts from "./__fixtures__/aapl.facts.json";
import aaplProfile from "./__fixtures__/aapl.submissions.json";
import rbcFacts from "./__fixtures__/ry.facts.json";
import rbcProfile from "./__fixtures__/ry.submissions.json";
import shopFacts from "./__fixtures__/shop.facts.json";
import shopProfile from "./__fixtures__/shop.submissions.json";
import { slimCompany, type SlimCompany } from "./slim";
import { buildFinancials, padCik } from "./statements";
import type { CompanyFinancials } from "./types";

export type { SlimCompany, SlimPoint, SlimStatement } from "./slim";

/**
 * Real statements from three companies' SEC filings, saved in the repo, so the Numbers page works
 * without calling the SEC. Built with the same engine that serves live data. Server-only.
 */
let cached: SlimCompany[] | null = null;
export function getSampleCompanies(): SlimCompany[] {
  if (cached) return cached;
  const at = "saved copy";
  cached = [
    slimCompany("aapl", "AAPL", "gold", buildFinancials(aaplFacts, aaplProfile, at)),
    slimCompany("shop", "SHOP", "pink", buildFinancials(shopFacts, shopProfile, at)),
    slimCompany("ry", "RY", "cyan", buildFinancials(rbcFacts, rbcProfile, at)),
  ];
  return cached;
}

let savedByCik: Map<string, CompanyFinancials> | null = null;
/** Saved copies of the three sample companies, keyed by 10-digit CIK. Used when the SEC cannot be reached. */
export function getSavedFinancials(cik: string): CompanyFinancials | null {
  if (!savedByCik) {
    const at = "saved copy";
    savedByCik = new Map(
      [buildFinancials(aaplFacts, aaplProfile, at), buildFinancials(shopFacts, shopProfile, at), buildFinancials(rbcFacts, rbcProfile, at)].map((f) => [f.company.cik, f]),
    );
  }
  return savedByCik.get(padCik(cik)) ?? null;
}
