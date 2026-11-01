"use client";

import { useActionState, useEffect, useState } from "react";
import { changePassword, deleteAccount, updatePreferences, updateProfile } from "@/app/account/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/validation/auth";

/** Shows a toast when a form action reports success. */
function useSuccessToast(state: FormState) {
  const toast = useToast();
  useEffect(() => {
    if (state.ok && state.message) toast(state.message);
  }, [state, toast]);
}

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function ProfileForm({ username, displayName, email, nextChangeDate }: { username: string; displayName: string; email: string; nextChangeDate: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  useSuccessToast(state);
  const locked = nextChangeDate !== null;
  return (
    <form action={action} className="space-y-4 p-5" noValidate>
      {!state.ok && <FormMessage state={state} />}
      <TextField label="Email" value={email} readOnly disabled hint="Your sign-in email." />
      <TextField
        label="Username"
        name="username"
        defaultValue={username}
        autoCapitalize="none"
        spellCheck={false}
        readOnly={locked}
        error={state.fieldErrors?.username}
        hint={locked ? `You can change your username again on ${nextChangeDate}.` : "3–20 letters, numbers or underscores. After a change, you can’t change it again for 14 days."}
      />
      <TextField label="Display name" name="displayName" defaultValue={displayName} maxLength={60} error={state.fieldErrors?.displayName} hint="Optional. Shown in your account menu." />
      <Button type="submit" loading={pending}>{pending ? "Saving" : "Save profile"}</Button>
    </form>
  );
}

export function PreferencesForm({ market, range }: { market: string; range: string }) {
  const [state, action, pending] = useActionState(updatePreferences, {});
  useSuccessToast(state);
  return (
    <form action={action} className="space-y-4 p-5">
      {!state.ok && <FormMessage state={state} />}
      <div>
        <label htmlFor="defaultMarket" className="mb-1.5 block text-[13px] font-medium">Default market</label>
        <select id="defaultMarket" name="defaultMarket" defaultValue={market} className={selectClass}>
          <option value="ALL">United States and Canada</option>
          <option value="US">United States only</option>
          <option value="CA">Canada only</option>
        </select>
      </div>
      <div>
        <label htmlFor="defaultComparisonRange" className="mb-1.5 block text-[13px] font-medium">Default comparison range</label>
        <select id="defaultComparisonRange" name="defaultComparisonRange" defaultValue={range} className={selectClass}>
          <option value="1M">1 month</option>
          <option value="6M">6 months</option>
          <option value="1Y">1 year</option>
          <option value="5Y">5 years</option>
          <option value="MAX">Maximum available</option>
        </select>
      </div>
      <Button type="submit" loading={pending}>{pending ? "Saving" : "Save preferences"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  useSuccessToast(state);
  return (
    <form action={action} className="space-y-4 p-5" noValidate>
      {!state.ok && <FormMessage state={state} />}
      <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" error={state.fieldErrors?.currentPassword} />
      <PasswordField label="New password" name="password" autoComplete="new-password" showRules error={state.fieldErrors?.password} />
      <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" error={state.fieldErrors?.confirmPassword} />
      <Button type="submit" loading={pending}>{pending ? "Updating" : "Change password"}</Button>
    </form>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <div className="p-5">
      <p className="text-sm text-muted">
        Permanently deletes your account, watchlists, comparisons and notes. This can’t be undone.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>Delete account</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <form action={action} className="space-y-4" noValidate>
          <FormMessage state={state} />
          <TextField label="Type DELETE to confirm" name="confirmation" autoComplete="off" error={state.fieldErrors?.confirmation} />
          <PasswordField label="Your password" name="password" autoComplete="current-password" error={state.fieldErrors?.password} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={pending}>{pending ? "Deleting" : "Delete forever"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
