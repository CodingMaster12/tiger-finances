import { z } from "zod";

export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (p: string) => p.length >= 10 },
  { id: "letter", label: "At least one letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { id: "number", label: "At least one number", test: (p: string) => /\d/.test(p) },
] as const;

// Supabase hashes with bcrypt, which ignores everything past 72 bytes.
const MAX_PASSWORD_BYTES = 72;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254));

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, "3–20 characters: letters, numbers and underscores only.");

export const passwordSchema = z
  .string()
  .superRefine((p, ctx) => {
    const failed = PASSWORD_RULES.find((r) => !r.test(p));
    if (failed) ctx.addIssue({ code: "custom", message: `Password needs: ${failed.label.toLowerCase()}.` });
    if (new TextEncoder().encode(p).length > MAX_PASSWORD_BYTES) {
      ctx.addIssue({ code: "custom", message: "Password must be 72 bytes or fewer." });
    }
  });

export const registerSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .max(60, "Display name must be 60 characters or fewer.")
    .transform((v) => (v === "" ? null : v)),
});

export const preferencesSchema = z.object({
  defaultMarket: z.enum(["ALL", "US", "CA"]),
  defaultComparisonRange: z.enum(["1M", "6M", "1Y", "5Y", "MAX"]),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password."), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

/**
 * Only same-site relative paths may be used as post-login destinations.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com") and backslash tricks.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) {
    return fallback;
  }
  return next;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Flattens zod issues into one message per field (first issue wins). */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
