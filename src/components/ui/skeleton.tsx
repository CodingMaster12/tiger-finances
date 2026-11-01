import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-[shimmer_1.6s_linear_infinite] rounded-md bg-[length:200%_100%]", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)",
      }}
    />
  );
}
