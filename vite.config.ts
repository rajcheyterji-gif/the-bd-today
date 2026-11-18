import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// THE BD TODAY — Vite builds the public site (src/client) and the admin
// dashboard (src/admin) into dist/client, which Wrangler serves as static
// assets. The Worker API (src/server) is bundled separately by Wrangler.
export default defineConfig({
  plugins: [react()],
  root: "src/client",
  publicDir: "../../public",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // In local dev the Worker API runs on :8787 (`npm run dev:worker`).
      // The SPA calls relative /api/* URLs, so the proxy keeps them working.
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
