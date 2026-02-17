# RunSmart

RunSmart is an AI-guided endurance training planner. This repo is on a **Vite-first strangler migration** so we can move safely from legacy static scripts to a modern front-end.

## Strangler migration status

- ✅ **Fase 1**: React shell + statisk UI
- ✅ **Fase 2**: Auth (Supabase OAuth wired in shell)
- ✅ **Fase 3**: Plans/Insights/Data shell sections ready for module extraction
- ✅ **Fase 4**: Legacy `app.js` is no longer loaded by `index.html`

## Deploy (Vercel production)

This project is now configured **Vercel-first**:

- `vite.config.mjs` defaults to `base: "/"` (correct for Vercel).
- If `VERCEL` is set, `base` is forced to root.
- GitHub Pages base (`/<repo-navn>/`) is only used when explicitly enabling:
  - `VITE_DEPLOY_TARGET=github-pages`
  - optional override via `VITE_BASE_PATH`

## Supabase URL configuration verification

In Supabase Dashboard → **Authentication** → **URL Configuration**:

1. **Site URL** (production)
   - `https://<your-vercel-domain>/`

2. **Redirect URLs** (must include both)
   - `http://localhost:5173/`
   - `https://<your-vercel-domain>/`

If you also keep GitHub Pages as a fallback environment, add that URL too:
- `https://<username>.github.io/<repo-navn>/`

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
