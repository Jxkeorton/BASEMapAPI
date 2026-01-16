import * as Sentry from "@sentry/node";
import { AuthError, PostgrestError } from "@supabase/supabase-js";
import {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { ErrorResponse } from "../shared/ErrorResponse";

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      Sentry.captureException(error, {
        tags: {
          errorType: getErrorType(error),
          statusCode: getStatusCode(error).toString(),
        },
        extra: {
          url: request.url,
          method: request.method,
          headers: request.headers,
          query: request.query,
          params: request.params,
          userAgent: request.headers["user-agent"],
        },
        user: {
          // Add user context if available from JWT or session
          ip_address: request.ip,
        },
      });

      let response: ErrorResponse = {
        success: false,
        message: "Internal server error",
      };

      // Fastify schema validation errors
      if (error.code === "FST_ERR_VALIDATION" && "validation" in error) {
        fastify.log.warn(
          { err: error, url: request.url },
          "Schema validation error",
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
    },
  );
}

// Helper functions
function getErrorType(error: FastifyError): string {
  if (error.code === "FST_ERR_VALIDATION") return "validation";
  if (error instanceof AuthError) return "auth";
  if (error instanceof PostgrestError) return "database";
  if (error.code?.startsWith("FST_")) return "fastify";
  if (error.statusCode) return "http";
  return "unhandled";
}

function getStatusCode(error: FastifyError): number {
  if (error.code === "FST_ERR_VALIDATION") return 400;
  if (error instanceof AuthError) return error.status || 401;
  if (error instanceof PostgrestError) return 400;
  return error.statusCode || 500;
}
