# RunSmart

RunSmart is an AI-guided endurance training planner. This repo is on a **Vite-first migration** with deployment on Vercel.

## Current frontend runtime

- Vite serves and builds the app from `index.html`.
- Current runtime still uses `src/main.js` with CDN React/ReactDOM while migration is in progress.
- Runtime secrets/config values are loaded from `public/runtime-config.js`.

## Complete changeover checklist (Vite + Vercel)

1. **Use Vite entrypoint only**
   - `index.html` should render `<div id="root"></div>` and load `/src/main.jsx`.
2. **Use Vite-compatible Supabase config**
   - Provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env vars, or set matching values in `public/runtime-config.js`.
3. **Verify Vercel build settings**
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Set auth redirect URLs in Supabase**
   - `http://localhost:5173/`
   - `https://<your-vercel-domain>/`
5. **Deploy and verify runtime**
   - Check sidebar shell loads
   - Verify page switching works
   - Verify auth flow redirects back to the deployed URL

## Deploy (Vercel production)

This project is configured **Vercel-first**:

- `vite.config.mjs` defaults to `base: "/"` (correct for Vercel).
- If `VERCEL` is set, `base` is forced to root.
- GitHub Pages base (`/<repo-navn>/`) is only used when explicitly enabled:
  - `VITE_DEPLOY_TARGET=github-pages`
  - optional override via `VITE_BASE_PATH`

## AUTH_REDIRECT_URL / runtime config (dev + prod parity)

Runtime config is loaded from `public/runtime-config.js` and can be overridden by Vite env vars.

Priority order:

1. `VITE_AUTH_REDIRECT_URL`
2. `window.RUNTIME_CONFIG.AUTH_REDIRECT_URL`
3. fallback to `${window.location.origin}${import.meta.env.BASE_URL}`

This gives consistent behavior in both local dev and Vercel production.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
