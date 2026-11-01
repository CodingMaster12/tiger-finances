import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Pick a strong password you don’t use anywhere else.">
      <Suspense fallback={<p className="text-sm text-muted">Checking your reset link…</p>}>
        <ResetBody />
      </Suspense>
    </AuthCard>
  );
}

/** Reached from the email link, which signs the user in via /auth/callback first. */
async function ResetBody() {
  let hasSession = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    hasSession = Boolean((await supabase.auth.getUser()).data.user);
  }
  return hasSession ? (
    <ResetForm />
  ) : (
    <p className="text-sm text-muted">
      This reset link has expired or was already used.{" "}
      <Link href="/forgot-password" className="font-semibold text-accent hover:underline">Request a new link</Link>.
    </p>
  );
}
