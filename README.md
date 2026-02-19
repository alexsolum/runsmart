# RunSmart

RunSmart is an AI-guided endurance training planner. This repo is on a **Vite-first migration** with deployment on Vercel.

## Current frontend runtime

- Vite serves and builds the app from `index.html`.
- Runtime entrypoint is `src/main.jsx` with bundled React via Vite.
- Runtime secrets/config values are loaded from `public/runtime-config.js`.


## If Vercel deploy shows a blank page

Most common causes after switching `index.html`:

1. **Entrypoint mismatch**
   - Ensure `index.html` uses `<div id="root"></div>` and `src/main.jsx`.
2. **Supabase config missing at runtime**
   - Confirm either `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set in Vercel, or `public/runtime-config.js` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. **Auth redirect not allowed in Supabase**
   - Add your Vercel URL in Supabase Auth redirect URLs.
4. **Cache stale deploy assets**
   - Redeploy and hard refresh once.

This app now renders even when Supabase config is missing, so missing config should not produce a white screen anymore.

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

## Feilsøking: JWT-feil i Strava-auth (Supabase Edge Functions)

Hvis Strava-connect feiler med meldinger som `invalid JWT`, `JWT expired`, `Missing bearer token` eller `Unauthorized`, sjekk dette i rekkefølge:

1. **Frontend peker til riktig Supabase-prosjekt**
   - `SUPABASE_URL` og `SUPABASE_ANON_KEY` i `public/runtime-config.js` (eller `VITE_*` i miljøvariabler) må være fra samme prosjekt som Edge Functions er deployet til.
2. **Bruker er faktisk logget inn før Strava-connect starter**
   - Edge Functions krever `Authorization: Bearer <access_token>` fra en gyldig Supabase-session.
3. **Required secrets finnes i Supabase Edge Functions**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
4. **Redirect URL er tillatt i både Strava og Supabase Auth**
   - Lokal: `http://localhost:5173/`
   - Prod: `https://<domene>/`

### Nyttige CLI-kommandoer

```bash
# logg inn og link prosjekt
supabase login
supabase link --project-ref <project_ref>

# sett/oppdater edge secrets
supabase secrets set \
  SUPABASE_URL=https://<project_ref>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
  STRAVA_CLIENT_ID=<strava_client_id> \
  STRAVA_CLIENT_SECRET=<strava_client_secret>

# deploy funksjonene på nytt
supabase functions deploy strava-auth
supabase functions deploy strava-sync

# sjekk logs mens du tester innlogging
supabase functions logs --name strava-auth
supabase functions logs --name strava-sync
```

### Rask verifisering av token mot funksjon

Kjør dette med en aktiv bruker sin `access_token` (ikke anon key):

```bash
curl -i \
  -X POST "https://<project_ref>.supabase.co/functions/v1/strava-sync" \
  -H "Authorization: Bearer <access_token>" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

- `401 + Missing bearer token`: Authorization-header mangler/er feil format.
- `401 + JWT validation failed`: frontend-token hører ikke til samme Supabase-prosjekt eller er utløpt.
- `500 + missing required Edge Function secrets`: secrets mangler i Supabase.
