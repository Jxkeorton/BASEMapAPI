import { ZodError } from "zod";

export type ErrorResponse = {
  success: false;
  error: string;
  details?: ZodError['issues'] | string;
};