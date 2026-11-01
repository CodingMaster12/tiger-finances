"use client";

import { useState } from "react";
import { PASSWORD_RULES } from "@/lib/validation/auth";

/** Tracks a password + confirmation. `valid` is true only when every requirement box is met and both match. */
export function usePasswordPair() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const rulesMet = PASSWORD_RULES.every((r) => r.test(password));
  return { setPassword, setConfirm, rulesMet, valid: rulesMet && confirm.length > 0 && password === confirm };
}
