"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableWrap, Td, Th } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";

const swatches = [
  ["bg", "Background"], ["surface", "Surface"], ["surface-2", "Surface 2"], ["border", "Border"],
  ["brand", "Brand"], ["accent", "Accent"], ["positive", "Positive"], ["negative", "Negative"],
  ["warning", "Warning"], ["series-1", "Series 1"], ["series-2", "Series 2"], ["series-3", "Series 3"],
];

export default function Styleguide() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">Design system</h1>
        <p className="mt-1 text-muted">
          Tokens and components used across the app. Table values here are layout samples only, not market data.
        </p>
      </div>

      <Card>
        <CardHeader title="Color tokens" />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map(([v, label]) => (
            <div key={v}>
              <div className="h-12 rounded-md border border-border" style={{ background: `var(--${v})` }} />
              <p className="mt-1 text-xs font-medium">{label}</p>
              <p className="num text-xs text-subtle">--{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Buttons and feedback" />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                toast("Saved to your watchlist");
              }, 1200);
            }}
          >
            {loading ? "Saving" : "Loading demo"}
          </Button>
          <Button variant="secondary" onClick={() => toast("Could not save. Try again.", "error")}>Error toast</Button>
          <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
          <Badge tone="info">Info</Badge>
          <Badge tone="positive">Positive</Badge>
          <Badge tone="negative">Negative</Badge>
          <Badge tone="warning">Warning</Badge>
        </div>
      </Card>

      <div className="grid items-start gap-8 md:grid-cols-2">
        <Card>
          <CardHeader title="Form fields" />
          <div className="space-y-4 p-5">
            <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" hint="We never share your email." />
            <TextField label="Username" defaultValue="ab" error="Username must be at least 3 characters." />
            <TextField label="Disabled" disabled defaultValue="Not editable" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Loading, empty and error" />
          <div className="space-y-3 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-24 w-full" /></div>
          <div className="border-t border-border"><EmptyState title="No companies saved yet" description="Search for a company and add it to a watchlist." /></div>
          <div className="border-t border-border"><ErrorState title="Couldn’t load data" description="The data provider didn’t respond." /></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Financial table" subtitle="Right-aligned tabular figures; unavailable values show a dash (layout sample)" />
        <TableWrap aria-label="Sample financial table">
          <Table>
            <thead><tr><Th>Metric</Th><Th numeric>FY2023</Th><Th numeric>FY2024</Th><Th numeric>Change</Th></tr></thead>
            <tbody className="hover-rows">
              <tr><Td>Revenue (sample)</Td><Td numeric value="1,000.0" /><Td numeric value="1,120.0" /><Td numeric><Delta value={12} /></Td></tr>
              <tr><Td>Net income (sample)</Td><Td numeric value="80.0" /><Td numeric value="64.0" /><Td numeric><Delta value={-20} /></Td></tr>
              <tr><Td>Free cash flow (sample)</Td><Td numeric value="55.0" /><Td numeric value={null} /><Td numeric><Delta value={null} /></Td></tr>
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Delete watchlist?">
        <p className="text-sm text-muted">This removes the watchlist and its saved companies. This can’t be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
