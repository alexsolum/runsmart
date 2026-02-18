const runtime = window.RUNTIME_CONFIG || {};

function normalizeUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || runtime.SUPABASE_URL || "",
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY || runtime.SUPABASE_ANON_KEY || "",
  stravaClientId:
    import.meta.env.VITE_STRAVA_CLIENT_ID || runtime.STRAVA_CLIENT_ID || "",
  authRedirectUrl:
    import.meta.env.VITE_AUTH_REDIRECT_URL || runtime.AUTH_REDIRECT_URL || "",
  baseUrl: import.meta.env.BASE_URL || "/",
};

export function getAuthRedirectUrl() {
  if (config.authRedirectUrl) return normalizeUrl(config.authRedirectUrl);
  const root = `${window.location.origin}${config.baseUrl}`;
  return normalizeUrl(root);
}

export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
