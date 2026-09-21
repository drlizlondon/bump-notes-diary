// Minimal vitest config (the repo had no test runner before this — see
// docs/WORK.md §7 / DPIA 2026-09-21 §6 R1). Node environment only: these
// tests cover server-side data-erasure functions, not UI.
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
