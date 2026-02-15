# RunSmart

RunSmart is a web-first training planning app concept for endurance runners. It focuses on practical
periodization, explainable AI coaching insights, and privacy-first data handling.

## Project status

This repository currently contains a static front-end prototype based on the product vision described
in `agents.md`. The UI is ready for iterative additions like Firebase-backed auth, Strava ingestion,
and the AI training agents.

## Supabase Auth setup (Google OAuth)

If Google login redirects you to `http://localhost:3000`, your Supabase Auth URLs are misconfigured.

1. In Supabase Dashboard → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your deployed app URL (for example `https://<username>.github.io/runsmart/`).
   - Add both local and production callback URLs to **Redirect URLs**:
     - `http://localhost:8000/`
     - `https://<username>.github.io/runsmart/`
2. In `config.js`, optionally set `AUTH_REDIRECT_URL` to your deployed URL. If left empty, the app uses the current page URL.

## Local development

Open `index.html` directly in the browser or run a simple static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.
