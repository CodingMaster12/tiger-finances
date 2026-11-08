import "server-only";
import { createLoaderCache } from "./cache";
import { createSecClient, resolveDataOrigin, type SecClient } from "./client";
import { buildFinancials, padCik } from "./statements";
import { SecError, type CompanyFinancials } from "./types";

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export interface FinancialsResult {
  data: CompanyFinancials;
  /** True when the SEC could not be reached and an older copy is shown. */
  stale: boolean;
}

export function createFinancialsService(client: SecClient = createSecClient(), now: () => number = Date.now) {
  // Only the small normalized result is cached; the multi-megabyte raw payload is discarded right away.
  const cache = createLoaderCache<CompanyFinancials>({ ttlMs: TWELVE_HOURS, now });

  return {
    async getCompanyFinancials(cikInput: string | number): Promise<FinancialsResult> {
      const raw = String(cikInput).trim();
      if (!/^\d{1,10}$/.test(raw)) throw new SecError("not_found", "That is not a valid SEC company number.");
      const cik = padCik(raw);
      const { value, stale } = await cache.get(cik, async () => {
        const profile = await client.getJson(`${resolveDataOrigin()}/submissions/CIK${cik}.json`);
        let facts: unknown;
        try {
          facts = await client.getJson(`${resolveDataOrigin()}/api/xbrl/companyfacts/CIK${cik}.json`);
        } catch (err) {
          if (err instanceof SecError && err.code === "not_found")
            throw new SecError("not_covered", "This company has no financial data in the SEC's structured (XBRL) filings.");
          throw err;
        }
        return buildFinancials(facts, profile, new Date(now()).toISOString());
      });
      return { data: value, stale };
    },
  };
}

/** Shared instance for server code. */
export const financialsService = createFinancialsService();
