"use client";

import { useActionState, useRef, useState } from "react";
import { checkUsername, register } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "./password-field";
import { FormMessage } from "./form-message";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, {});
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const seq = useRef(0);

  async function validateUsername(value: string) {
    if (!value) return setUsernameError(null);
    const id = ++seq.current;
    const result = await checkUsername(value);
    if (id === seq.current) setUsernameError(result);
  }

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={state.fieldErrors?.email} />
      <TextField
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        hint="3–20 letters, numbers or underscores. You can change it once every 14 days."
        error={state.fieldErrors?.username ?? usernameError ?? undefined}
        onBlur={(e) => validateUsername(e.target.value)}
      />
      <PasswordField label="Password" name="password" autoComplete="new-password" required showRules error={state.fieldErrors?.password} />
      <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" required error={state.fieldErrors?.confirmPassword} />
      <Button type="submit" loading={pending} className="w-full">{pending ? "Creating account" : "Create account"}</Button>
      <p className="text-xs text-subtle">
        By creating an account you agree to the terms and privacy policy once they are published.
      </p>
    </form>
  );
}
