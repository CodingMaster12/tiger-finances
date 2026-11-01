"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { weakPasswordMessage } from "@/lib/weak-password";
import { verifyPassword } from "@/lib/supabase/verify-password";
import {
  changePasswordSchema,
  fieldErrorsFrom,
  preferencesSchema,
  profileSchema,
  type FormState,
} from "@/lib/validation/auth";

const str = (fd: FormData, key: string) => (typeof fd.get(key) === "string" ? (fd.get(key) as string) : "");
const UNAUTH: FormState = { message: "Your session has expired. Please sign in again." };
const NETWORK: FormState = { message: "We couldn’t reach the server. Check your connection and try again." };

async function currentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({ username: str(fd, "username"), displayName: str(fd, "displayName") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    const ctx = await currentUser();
    if (!ctx) return UNAUTH;
    // The row is selected by id AND guarded by RLS; the cooldown is enforced by a database trigger.
    const { error } = await ctx.supabase
      .from("profiles")
      .update({ username: parsed.data.username, display_name: parsed.data.displayName })
      .eq("id", ctx.user.id);
    if (error) {
      if (error.code === "23505") return { fieldErrors: { username: "That username is taken." } };
      if (error.code === "P0001") return { fieldErrors: { username: error.message } };
      return { message: "We couldn’t save your profile. Please try again." };
    }
  } catch {
    return NETWORK;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updatePreferences(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = preferencesSchema.safeParse({
    defaultMarket: str(fd, "defaultMarket"),
    defaultComparisonRange: str(fd, "defaultComparisonRange"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    const ctx = await currentUser();
    if (!ctx) return UNAUTH;
    const { error } = await ctx.supabase
      .from("user_preferences")
      .update({ default_market: parsed.data.defaultMarket, default_comparison_range: parsed.data.defaultComparisonRange })
      .eq("user_id", ctx.user.id);
    if (error) return { message: "We couldn’t save your preferences. Please try again." };
  } catch {
    return NETWORK;
  }
  return { ok: true, message: "Preferences saved." };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: str(fd, "currentPassword"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    const ctx = await currentUser();
    if (!ctx?.user.email) return UNAUTH;
    // Re-authenticate before a sensitive change.
    if (!(await verifyPassword(ctx.user.email, parsed.data.currentPassword))) {
      return { fieldErrors: { currentPassword: "That isn’t your current password." } };
    }
    const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven’t used before." } };
      if (error.code === "weak_password") return { fieldErrors: { password: weakPasswordMessage(error) } };
      return { message: "We couldn’t update your password. Please try again." };
    }
  } catch {
    return NETWORK;
  }
  return { ok: true, message: "Password updated." };
}

export async function deleteAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, "confirmation") !== "DELETE") return { fieldErrors: { confirmation: "Type DELETE to confirm." } };
  const password = str(fd, "password");
  if (!password) return { fieldErrors: { password: "Enter your password." } };
  try {
    const ctx = await currentUser();
    if (!ctx?.user.email) return UNAUTH;
    if (!(await verifyPassword(ctx.user.email, password))) {
      return { fieldErrors: { password: "That isn’t your password." } };
    }
    if (!process.env.SUPABASE_SECRET_KEY) {
      return { message: "Account deletion isn’t configured on this server (missing SUPABASE_SECRET_KEY)." };
    }
    // Deleting the auth user cascades to profiles, preferences and all other user-owned rows.
    const { error } = await createAdminClient().auth.admin.deleteUser(ctx.user.id);
    if (error) return { message: "We couldn’t delete your account. Please try again." };
    await ctx.supabase.auth.signOut();
  } catch {
    return NETWORK;
  }
  return { ok: true, redirectTo: "/login?deleted=1" };
}
