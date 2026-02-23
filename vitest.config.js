import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        // Pure compute / domain logic — fast, no DOM needed
        test: {
          name: "unit",
          include: ["tests/compute.test.js"],
          environment: "node",
        },
      },
      {
        // React component tests — require jsdom + React Testing Library
        plugins: [react()],
        test: {
          name: "components",
          include: ["tests/**/*.test.jsx"],
          environment: "jsdom",
          setupFiles: ["./tests/setup.js"],
          globals: true,
        },
      },
    ],
  },
});
