import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccount, PasswordForm, PreferencesForm, ProfileForm } from "@/components/account/forms";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nextUsernameChange } from "@/lib/username";

export const metadata: Metadata = { title: "Account settings" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl"><Skeleton className="h-8 w-56" /><Skeleton className="mt-6 h-64 w-full" /></div>}>
      <AccountBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountBody({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/account");

  // RLS guarantees these queries can only ever return the signed-in user's rows.
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, username_changed_at").maybeSingle(),
    supabase.from("user_preferences").select("default_market, default_comparison_range").maybeSingle(),
  ]);

  const sp = await searchParams;
  const nextChange = nextUsernameChange(profile?.username_changed_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand">Account settings</h1>
        <p className="mt-1 text-muted">Member since {formatDate(auth.user.created_at)}.</p>
        {sp.passwordReset && <p role="status" className="mt-3 rounded-md bg-positive-soft px-3 py-2 text-sm text-positive">Your password has been updated.</p>}
      </div>
      <Card>
        <CardHeader title="Profile" />
        <ProfileForm
          username={profile?.username ?? ""}
          displayName={profile?.display_name ?? ""}
          email={auth.user.email ?? ""}
          nextChangeDate={nextChange ? formatDate(nextChange) : null}
        />
      </Card>
      <Card>
        <CardHeader title="Preferences" subtitle="Defaults for search and comparisons." />
        <PreferencesForm market={prefs?.default_market ?? "ALL"} range={prefs?.default_comparison_range ?? "1Y"} />
      </Card>
      <Card>
        <CardHeader title="Security" subtitle="Changing your password requires your current one." />
        <PasswordForm />
      </Card>
      <Card>
        <CardHeader title="Delete account" />
        <DeleteAccount />
      </Card>
    </div>
  );
}
