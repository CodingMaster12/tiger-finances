import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  /** Element rendered inside the right edge, e.g. a show/hide control. */
  trailing?: ReactNode;
};

export function TextField({ label, hint, error, trailing, className, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-md border bg-surface px-3 text-sm text-text placeholder:text-subtle",
            "transition-colors hover:border-border-strong focus:border-accent focus:outline-none",
            "focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-subtle",
            error ? "border-negative" : "border-border",
            trailing && "pr-11",
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] font-medium text-negative">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
