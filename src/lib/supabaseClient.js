import { createClient } from "@supabase/supabase-js";
import { config } from "../config/runtime";

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabaseClient = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error("Supabase is not configured. Add runtime-config.js values or VITE_SUPABASE_* env vars.");
  }
  return supabaseClient;
}
