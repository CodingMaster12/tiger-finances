import { CheckCircle2, XCircle } from "lucide-react";
import type { FormState } from "@/lib/validation/auth";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  const ok = state.ok;
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}
