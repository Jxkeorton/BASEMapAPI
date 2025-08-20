import { ZodError } from "zod";
import { PostgrestError, AuthError } from "@supabase/supabase-js";

// DO NOT CHANGE - shared type for use within the UI
export type ErrorResponse = {
  success: false;
  error: string;
  details?: ZodError['issues'] | string;
};