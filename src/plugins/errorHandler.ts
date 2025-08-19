import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";
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
      reply.code(500).send(response);
    }
  );
}