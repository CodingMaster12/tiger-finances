import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Save companies, comparisons and notes, and open them on any device."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-accent hover:underline">Sign in</Link></>}
    >
      <RegisterForm />
    </AuthCard>
  );
}
