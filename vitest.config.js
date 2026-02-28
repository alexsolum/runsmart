import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        // Pure compute / domain logic — fast, no DOM needed
        test: {
          name: "unit",
          include: ["tests/unit/compute.test.js"],
          environment: "node",
        },
      },
      {
        // React component and UI contract tests — require jsdom + React Testing Library
        plugins: [react()],
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
          },
        },
        test: {
          name: "components",
          include: ["tests/unit/**/*.test.jsx", "tests/ui/**/*.test.jsx"],
          environment: "jsdom",
          setupFiles: ["./tests/unit/setup.js"],
          globals: true,
        },
      },
    ],
  },
});
