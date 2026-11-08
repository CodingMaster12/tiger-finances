import { SecError, type SecErrorCode } from "./types";

export interface UserFacingError {
  title: string;
  message: string;
  /** True when showing a saved copy (if we have one) is better than showing nothing. */
  canFallBack: boolean;
}

/** Plain-language messages for visitors. Internal details (env variable names, URLs) never appear here. */
export function describeSecError(err: unknown): UserFacingError {
  const code: SecErrorCode | "unknown" = err instanceof SecError ? err.code : "unknown";
  switch (code) {
    case "not_covered":
      return {
        title: "No financial statements for this company",
        message: "The SEC has no structured financial data for it. This usually means the company does not file with the SEC, so we cannot show numbers for it.",
        canFallBack: false,
      };
    case "not_found":
      return { title: "Company not found", message: "The SEC has no company with that number.", canFallBack: false };
    case "rate_limited":
      return { title: "The SEC is busy right now", message: "It is limiting requests. Please try again in a few minutes.", canFallBack: true };
    case "config":
      return { title: "Live data is not connected yet", message: "This site has not finished its connection to the SEC.", canFallBack: true };
    case "invalid_data":
      return { title: "We could not read this company's data", message: "The SEC returned data in an unexpected shape, so we are not showing it rather than guessing.", canFallBack: false };
    default:
      return { title: "Could not load this company", message: "Something went wrong reaching the SEC. Please try again.", canFallBack: true };
  }
}
