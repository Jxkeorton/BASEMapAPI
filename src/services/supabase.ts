import { createClient } from "@supabase/supabase-js";
import { appConfig } from "../config";

// Create a basic client for public operations (like reading locations)
export const supabaseClient = createClient(
  appConfig.supabase.url,
  appConfig.supabase.anonKey
);

// Admin client for protected operations that bypass RLS
export const supabaseAdmin = createClient(
  appConfig.supabase.url,
  appConfig.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
