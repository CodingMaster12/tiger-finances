import { searchCompanies, type SearchResult } from "./search";
import { loadTickerSnapshot } from "./tickers";

export const MAX_QUERY_LENGTH = 80;

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  /** False while only the small starter list is installed (see `npm run sec:tickers`). */
  complete: boolean;
}

/** Search the saved SEC company list. Pure and fast: no network. Over-long queries are cut, not rejected. */
export function runSearch(rawQuery: string, limit = 8): SearchResponse {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const snapshot = loadTickerSnapshot();
  return { query, results: query ? searchCompanies(snapshot.entries, query, limit) : [], complete: snapshot.complete };
}
