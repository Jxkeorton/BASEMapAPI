import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";
import { appConfig } from "../config";
import { validateApiKey } from "../middleware/apiKey";

export async function registerPlugins(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet);

  await fastify.register(fastifyCors, {
    origin: appConfig.api.corsOrigin,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: appConfig.rateLimit.max,
    timeWindow: appConfig.rateLimit.timeWindow,
  });

  fastify.addHook("preHandler", async (request, reply) => {
    if (
      request.url === "/health" ||
      request.url.startsWith("/docs") ||
      request.url === "/subscriptions/webhook"
    ) {
      return;
    }
    await validateApiKey(request, reply);
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "BASE Map API",
        description: "API for BASE jumping locations and user management",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://${appConfig.host}:${appConfig.port}`,
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
}
