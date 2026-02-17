import { createClient } from "@supabase/supabase-js";

function readConfig(key) {
  if (typeof globalThis !== "undefined" && typeof globalThis[key] !== "undefined") {
    return globalThis[key];
  }
  return undefined;
}

const supabaseUrl = readConfig("SUPABASE_URL");
const supabaseAnonKey = readConfig("SUPABASE_ANON_KEY");

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error("Supabase is not configured. Check config.js values.");
  }
  return supabaseClient;
}
