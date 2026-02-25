// Empty PostCSS config — Tailwind v4 is handled by @tailwindcss/vite, not PostCSS.
// This file exists to stop Vite from searching parent directories for PostCSS config
// (a parent-directory package.json has a UTF-8 BOM that breaks JSON parsing).
export default {};
