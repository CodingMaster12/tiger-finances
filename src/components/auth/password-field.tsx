"use client";

import { Check, Eye, EyeOff, Circle } from "lucide-react";
import { useState } from "react";
import { PASSWORD_RULES } from "@/lib/validation/auth";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";

export function PasswordField({
  showRules = false,
  onValueChange,
  ...props
}: Omit<TextFieldProps, "type" | "trailing"> & { showRules?: boolean; onValueChange?: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  return (
    <div>
      <TextField
        {...props}
        type={visible ? "text" : "password"}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        }
      />
      {showRules && (
        <ul className="mt-2 space-y-1 text-[13px]" aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const met = r.test(value);
            return (
              <li key={r.id} className={`flex items-center gap-1.5 ${met ? "text-positive" : "text-muted"}`}>
                {met ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                {r.label}
                <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
