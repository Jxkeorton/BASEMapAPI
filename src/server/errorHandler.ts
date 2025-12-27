import { AuthError, PostgrestError } from "@supabase/supabase-js";
import {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import type { ErrorResponse } from "../shared/ErrorResponse";

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      let response: ErrorResponse = {
        success: false,
        message: "Internal server error",
      };

      // Zod validation error
      if (error instanceof ZodError) {
        fastify.log.warn({ err: error, url: request.url }, "Validation error");
        response = {
          success: false,
          message: "Invalid request data",
          details: error.issues,
        };
        return reply.code(400).send(response);
      }

      // Fastify schema validation errors
      if (error.code === "FST_ERR_VALIDATION" && "validation" in error) {
        fastify.log.warn(
          { err: error, url: request.url },
          "Schema validation error"
        );
        response = {
          success: false,
          message: error.validation?.[0]?.message || error.message,
          details: (error as any).validation,
        };
        return reply.code(400).send(response);
      }

      // Supabase Auth error
      if (error instanceof AuthError) {
        fastify.log.warn({ err: error, url: request.url }, "Auth error");
        response = {
          success: false,
          message: error.message,
        };
        return reply.code(error.status || 401).send(response);
      }

      // Supabase Postgrest error
      if (error instanceof PostgrestError) {
        fastify.log.error({ err: error, url: request.url }, "Database error");
        response = {
          success: false,
          message: error.message,
          details: error.details || undefined,
        };
        return reply.code(400).send(response);
      }

      // Other Fastify errors
      if (
        error.code &&
        typeof error.code === "string" &&
        error.code.startsWith("FST_")
      ) {
        fastify.log.warn({ err: error, url: request.url }, "Fastify error");
        response = {
          success: false,
          message: error.message,
        };
        return reply.code(error.statusCode || 400).send(response);
      }

      // Generic HTTP errors with statusCode
      if (error.statusCode && error.message) {
        const level = error.statusCode >= 500 ? "error" : "warn";
        fastify.log[level]({ err: error, url: request.url }, "HTTP error");
        response = {
          success: false,
          message: error.message,
        };
        return reply.code(error.statusCode).send(response);
      }

      // Fallback for all other errors
      fastify.log.error({ err: error, url: request.url }, "Unhandled error");
      if (error instanceof Error) {
        response.message = error.message;
      }

      return reply.code(500).send(response);
    }
  );
}
