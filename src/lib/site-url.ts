import { headers } from "next/headers";
import { normalizeSiteUrl } from "./normalize-url";

/** Absolute origin for links in emails. Prefers the configured site URL, then the request origin. */
export async function siteUrl(): Promise<string> {
  const configured = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
