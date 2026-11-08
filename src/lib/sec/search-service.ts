import { getCompanyList } from "./company-list";
import { searchCompanies, type SearchResult } from "./search";

export const MAX_QUERY_LENGTH = 80;

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  /** False while only the small starter list is available (the full SEC list has not been synced yet). */
  complete: boolean;
}

/** Search the SEC company list. Over-long queries are cut, not rejected. */
export async function runSearch(rawQuery: string, limit = 8): Promise<SearchResponse> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const list = await getCompanyList();
  return { query, results: query ? searchCompanies(list.entries, query, limit) : [], complete: list.complete };
}
