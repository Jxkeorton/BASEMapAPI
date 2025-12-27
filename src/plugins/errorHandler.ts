import { AuthError, PostgrestError } from "@supabase/supabase-js";
import {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import type { ErrorResponse } from "../shared/ErrorResponse";

export default async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      let response: ErrorResponse = {
        success: false,
        error: "Internal server error",
      };

      // Zod validation error
      if (error instanceof ZodError) {
        response = {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        };
        reply.code(400).send(response);
        return;
      }

      // Supabase Auth error
      if (error instanceof AuthError) {
        response = {
          success: false,
          error: error.message,
        };
        reply.code(error.status || 401).send(response);
        return;
      }

      // Supabase Postgrest error
      if (error instanceof PostgrestError) {
        response = {
          success: false,
          error: error.message,
          details: error.details || undefined,
        };
        reply.code(400).send(response);
        return;
      }

      // Fastify HTTP errors (like 404, 400, etc)
      if (error.statusCode && error.message) {
        response = {
          success: false,
          error: error.message,
        };
        reply.code(error.statusCode).send(response);
        return;
      }

      // Fallback for all other errors
      if (error instanceof Error) {
        response.error = error.message;
      }

      // Fallback for all other errors
      reply.code(500).send(response);
    }
  );
}
