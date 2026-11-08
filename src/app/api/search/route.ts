import { NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/sec/search-service";

const params = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(25).default(8),
});

/** GET /api/search?q=apple&limit=8 -> { query, results, complete } */
export async function GET(request: Request) {
  const parsed = params.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search request." }, { status: 400 });
  const body = runSearch(parsed.data.q, parsed.data.limit);
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
}
