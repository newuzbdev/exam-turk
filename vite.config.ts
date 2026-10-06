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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const match = id.match(
            /node_modules\/((?:@[^/]+\/)?[^/]+)/,
          );
          const packageName = match?.[1];
          if (!packageName) return undefined;

          if (
            [
              "react",
              "react-dom",
              "react-router",
              "react-router-dom",
              "scheduler",
            ].includes(packageName)
          ) {
            return "vendor-react";
          }
          if (
            packageName.startsWith("@radix-ui/") ||
            ["class-variance-authority", "clsx", "tailwind-merge"].includes(
              packageName,
            )
          ) {
            return "vendor-ui";
          }
          if (
            packageName === "lucide-react" ||
            packageName === "iconoir-react"
          ) {
            return "vendor-icons";
          }
          if (packageName === "framer-motion") {
            return "vendor-motion";
          }
          if (
            packageName === "antd" ||
            packageName.startsWith("@ant-design/") ||
            packageName.startsWith("rc-")
          ) {
            return "vendor-antd";
          }
          if (
            packageName.startsWith("@tanstack/") ||
            packageName === "axios"
          ) {
            return "vendor-data";
          }
          return undefined;
        },
      },
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
