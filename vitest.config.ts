import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the Next server build; in unit tests it is just an empty module.
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Unit tests must never reach a real Supabase project or the SEC, whatever the machine has configured.
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SECRET_KEY: "", SEC_USER_AGENT: "", SEC_DATA_ORIGIN: "" },
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
