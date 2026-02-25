import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";

function resolveBase() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;

  // Vercel production/staging should always serve from root.
  if (process.env.VERCEL) return "/";

  // Optional GitHub Pages support when explicitly enabled.
  if (process.env.VITE_DEPLOY_TARGET === "github-pages" && repoName) {
    return `/${repoName}/`;
  }

  return "/";
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: resolveBase(),
  build: {
    outDir: "dist",
  },
});
