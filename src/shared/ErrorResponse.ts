import { ZodError } from "zod";

// DO NOT CHANGE - shared type for use within the UI
export type ErrorResponse = {
  success: false;
  message: string;
  details?: ZodError["issues"] | string | any[];
};
