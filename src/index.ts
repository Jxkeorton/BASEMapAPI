import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { appConfig } from "./config";
import { validateApiKey } from "./middleware/apiKey";
import errorHandlerPlugin from "./plugins/errorHandler";
import AdminLocationsRoutes from "./routes/admin/locations";
import AdminSubmissionsRoutes from "./routes/admin/submissions";
import AuthRoutes from "./routes/auth";
import SubmissionRoutes from "./routes/submissions";

const fastify = Fastify({
  logger: {
    level: appConfig.logging.level,
    ...(appConfig.nodeEnv === "development" && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    }),
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(helmet);
    await fastify.register(errorHandlerPlugin);

    await fastify.register(cors, {
      origin: appConfig.api.corsOrigin,
      credentials: true,
    });

    await fastify.register(rateLimit, {
      max: appConfig.rateLimit.max,
      timeWindow: appConfig.rateLimit.timeWindow,
    });

    fastify.addHook("preHandler", async (request, reply) => {
      if (request.url === "/health") {
        return;
      }

      if (request.url.startsWith("/docs")) {
        return;
      }

      await validateApiKey(request, reply);
    });

    // Swagger documentation
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

    // Health check
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Admin routes
    await fastify.register(AdminLocationsRoutes);
    await fastify.register(AdminSubmissionsRoutes);

    // Submission routes
    await fastify.register(SubmissionRoutes);

    // Location routes
    await fastify.register(import("./routes/locations/locations.get"));
    await fastify.register(import("./routes/locations/save.post"));
    await fastify.register(import("./routes/locations/unsave.delete"));
    await fastify.register(import("./routes/locations/saved.get"));

    // Auth routes
    await fastify.register(AuthRoutes);

    // Profile routes
    await fastify.register(import("./routes/profile/profile.get"));
    await fastify.register(import("./routes/profile/profile.patch"));

    // Subscription routes
    await fastify.register(import("./routes/subscriptions/webhook.post"));
    await fastify.register(import("./routes/subscriptions/restore.post"));

    // Logbook routes
    await fastify.register(import("./routes/logbook/logbook.post"));
    await fastify.register(import("./routes/logbook/logbook.patch"));
    await fastify.register(import("./routes/logbook/logbook.get"));
    await fastify.register(import("./routes/logbook/logbook.delete"));

    // Start server
    await fastify.listen({
      host: appConfig.host,
      port: appConfig.port,
    });

    fastify.log.info(
      `🚀 Server listening on http://${appConfig.host}:${appConfig.port}`
    );
    fastify.log.info(
      `📚 API Documentation available at http://${appConfig.host}:${appConfig.port}/docs`
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start();
