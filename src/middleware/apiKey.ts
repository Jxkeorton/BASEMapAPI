import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Middleware to validate API key for all requests
 * This will run BEFORE any other authentication middleware
 */
export const validateApiKey = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Get API key from x-api-key header
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) {
      return reply.code(401).send({
        success: false,
        error: "API key required. Include x-api-key header.",
      });
    }

    // Get the expected API key from environment
    const expectedApiKey = process.env.API_KEY;

    if (!expectedApiKey) {
      return reply.code(500).send({
        success: false,
        error: "API key validation not configured",
      });
    }

    // Validate the API key
    if (apiKey !== expectedApiKey) {
      return reply.code(403).send({
        success: false,
        error: "Invalid API key",
      });
    }
  } catch (error) {
    request.log.error("API key validation error:", error);
    return reply.code(500).send({
      success: false,
      error: "API key validation failed",
    });
  }
};
