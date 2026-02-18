import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    host: true,
    watch: {
      // Ignore local backup folders so Vite doesn't treat them as extra projects.
      ignored: [
        "**/backups/**",
        "**/backup-*/**",
        "**/*.zip",
      ],
    },
  },
});
