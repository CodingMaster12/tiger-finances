"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { FormMessage } from "./form-message";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state.fieldErrors?.email} />
      <Button type="submit" loading={pending} className="w-full">{pending ? "Sending" : "Send reset link"}</Button>
    </form>
  );
}
