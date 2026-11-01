"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  emailSchema,
  safeNextPath,
  usernameSchema,
  type FormState,
} from "@/lib/validation/auth";

const NOT_CONFIGURED: FormState = {
  message: "Accounts are not configured on this server yet. See docs/SUPABASE_SETUP.md.",
};
const NETWORK: FormState = { message: "We couldn’t reach the server. Check your connection and try again." };

const str = (fd: FormData, key: string) => (typeof fd.get(key) === "string" ? (fd.get(key) as string) : "");

/** Live username availability for the registration form. Returns an error message or null. */
export async function checkUsername(candidate: string): Promise<string | null> {
  const parsed = usernameSchema.safeParse(candidate);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("username_available", { candidate: parsed.data });
    if (error) return null; // Don't block typing on a transient failure; signup re-checks.
    return data ? null : "That username is taken.";
  } catch {
    return null;
  }
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = registerSchema.safeParse({
    email: str(fd, "email"),
    username: str(fd, "username"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { email, username, password } = parsed.data;
  const taken = await checkUsername(username);
  if (taken) return { fieldErrors: { username: taken } };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${await siteUrl()}/auth/callback?next=/account`,
      },
    });
    if (error) {
      if (error.code === "weak_password") return { fieldErrors: { password: "That password is too weak or commonly used." } };
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        return { message: "Too many sign-up emails were requested. Please wait a few minutes and try again." };
      }
      return { message: "We couldn’t create your account. Please try again." };
    }
    if (data.session) redirect("/account"); // Email confirmation is disabled on this project.
  } catch (e) {
    if (isRedirect(e)) throw e;
    return NETWORK;
  }
  // Identical response whether or not the email already exists, so accounts can't be enumerated.
  return { ok: true, message: "Check your email to confirm your account, then sign in." };
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const next = safeNextPath(str(fd, "next"));
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      if (error.code === "email_not_confirmed") return { message: "Confirm your email first. Check your inbox for the confirmation link." };
      if (error.status === 429) return { message: "Too many attempts. Please wait a moment and try again." };
      if (error.code === "invalid_credentials") return { message: "Incorrect email or password." };
      return { message: "We couldn’t sign you in. Please try again." };
    }
  } catch {
    return NETWORK;
  }
  redirect(next);
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = emailSchema.safeParse(str(fd, "email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error?.status === 429) return { message: "Too many requests. Please wait a few minutes and try again." };
  } catch {
    return NETWORK;
  }
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = resetPasswordSchema.safeParse({ password: str(fd, "password"), confirmPassword: str(fd, "confirmPassword") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { message: "This reset link has expired or was already used. Request a new one." };
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven’t used before." } };
      if (error.code === "weak_password") return { fieldErrors: { password: "That password is too weak or commonly used." } };
      return { message: "We couldn’t update your password. Please try again." };
    }
  } catch {
    return NETWORK;
  }
  redirect("/account?passwordReset=1");
}

function isRedirect(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
