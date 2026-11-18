import { defineConfig } from "vitest/config";

// Vitest runs from the repo root (unlike vite.config.ts, whose root is
// src/client for the SPA build). Tests live in tests/ and import the
// shared modules in src/shared/.
export default defineConfig({
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
