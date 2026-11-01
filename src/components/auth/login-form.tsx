"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "./password-field";
import { FormMessage } from "./form-message";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state.fieldErrors?.email} />
      <div>
        <PasswordField label="Password" name="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
        <div className="mt-2 text-right text-[13px]">
          <Link href="/forgot-password" className="font-medium text-accent hover:underline">Forgot password?</Link>
        </div>
      </div>
      <Button type="submit" loading={pending} className="w-full">{pending ? "Signing in" : "Sign in"}</Button>
    </form>
  );
}
