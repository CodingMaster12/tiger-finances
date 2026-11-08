import type { Metadata } from "next";
import { NumbersExplorer } from "@/components/numbers/numbers-explorer";
import { getSampleCompanies } from "@/lib/sec/sample";

export const metadata: Metadata = {
  title: "Numbers",
  description: "Company financial statements taken straight from SEC filings, with every figure traced to its source.",
};

export default function NumbersPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-[0.02em] sm:text-5xl">Numbers</h1>
        <p className="mt-3 max-w-[60ch] text-pretty text-muted">
          Real statements from SEC filings. Pick a company, switch between annual and quarterly, and hover any figure to see
          where it came from. Three companies for now; search comes next.
        </p>
      </header>
      <NumbersExplorer companies={getSampleCompanies()} />
    </div>
  );
}
