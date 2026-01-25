import { createClient } from "@supabase/supabase-js";
import { appConfig } from "../config";
import { Database } from "../types/supabase";

// Create a basic client for public operations (like reading locations)
export const supabaseClient = createClient<Database>(
  appConfig.supabase.url,
  appConfig.supabase.anonKey,
);

// Admin client for protected operations that bypass RLS
export const supabaseAdmin = createClient<Database>(
  appConfig.supabase.url,
  appConfig.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
