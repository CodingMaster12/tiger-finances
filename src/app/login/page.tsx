import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Pick up your research where you left off."
      footer={<>New to Tiger Finances? <Link href="/register" className="font-semibold text-accent hover:underline">Create an account</Link></>}
    >
      <Suspense fallback={<LoginForm next="/account" />}>
        <LoginBody searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginBody({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNextPath(one(sp.next));
  const notice =
    one(sp.error) === "link_invalid"
      ? "We couldn’t complete that email link in this browser. If you were confirming your email, it may already be confirmed, so try signing in. For a password reset, request a new link and open it in the same browser you requested it from."
      : one(sp.deleted)
        ? "Your account has been deleted."
        : null;
  return (
    <>
      {notice && <p role="status" className="mb-4 rounded-md bg-info-soft px-3 py-2 text-sm text-accent">{notice}</p>}
      <LoginForm next={next} />
    </>
  );
}
