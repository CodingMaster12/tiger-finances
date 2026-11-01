"use client";

import { useEffect } from "react";
import type { FormState } from "@/lib/validation/auth";

/**
 * Next.js keeps hidden pages' component state alive across client-side
 * navigation, so a soft redirect after sign-in or sign-out can resurface old
 * errors and typed values. A full page load starts every session clean.
 */
export function useHardRedirect(state: FormState) {
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);
}
