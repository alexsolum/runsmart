import { createClient } from "@supabase/supabase-js";
import { config } from "../config/runtime";

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabaseClient = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

export function getSupabaseClient() {
  return supabaseClient;
}
