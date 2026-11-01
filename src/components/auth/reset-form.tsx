"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/auth/actions";
import { useHardRedirect } from "@/lib/use-hard-redirect";
import { usePasswordPair } from "@/lib/use-password-pair";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";
import { FormMessage } from "./form-message";

export function ResetForm() {
  const [state, action, pending] = useActionState(resetPassword, {});
  const pw = usePasswordPair();
  useHardRedirect(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <PasswordField label="New password" name="password" autoComplete="new-password" required showRules onValueChange={pw.setPassword} error={state.fieldErrors?.password} />
      <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" required onValueChange={pw.setConfirm} error={state.fieldErrors?.confirmPassword} />
      <Button type="submit" loading={pending} disabled={!pw.valid} className="w-full">{pending ? "Saving" : "Set new password"}</Button>
    </form>
  );
}
