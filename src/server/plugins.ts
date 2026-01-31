import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";
import { appConfig } from "../config";
import { validateApiKey } from "../middleware/apiKey";
import cloudinary from "fastify-cloudinary";
import multipart from "@fastify/multipart";

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

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max per file
      files: 5, // Allow up to 5 files at a time
    },
  });
  fastify.register(cloudinary, {
    url: `cloudinary://${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}@${process.env.CLOUDINARY_CLOUD_NAME}`,
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
    transform: ({ schema, url }) => {
      // Remove /api/v1 prefix from the URL shown in docs
      const transformedUrl = url.replace(/^\/api\/v1/, "");

      return {
        schema,
        url: transformedUrl,
      };
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
