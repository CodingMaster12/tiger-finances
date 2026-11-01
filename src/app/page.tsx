import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <Badge tone="info">Milestone 1 · Foundation</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand">Tiger Finances</h1>
      <p className="mt-2 text-base text-muted">
        Equity research for US and Canadian public companies. Search, statements, comparisons and saved
        workspaces are being built in the next milestones.
      </p>
      <Card className="mt-8">
        <CardHeader title="Where things stand" subtitle="Nothing below is mocked as working when it is not." />
        <ul className="divide-y divide-border text-sm">
          {[
            ["Design system and UI kit", "Ready", "positive"],
            ["Financial calculations and formatting", "Ready, unit-tested", "positive"],
            ["Accounts and saved workspace", "Milestone 2", "neutral"],
            ["Company search and research pages", "Milestones 3–5", "neutral"],
            ["Comparison", "Milestone 6", "neutral"],
          ].map(([name, status, tone]) => (
            <li key={name} className="flex items-center justify-between px-5 py-3">
              <span>{name}</span>
              <Badge tone={tone as "positive" | "neutral"}>{status}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-6 text-sm">
        <Link href="/styleguide" className="font-semibold text-accent hover:underline">
          View the design system →
        </Link>
      </p>
    </div>
  );
}
