import Fastify from "fastify";
import { appConfig } from "./config";
import { registerErrorHandler } from "./server/errorHandler";
import { registerPlugins } from "./server/plugins";
import { registerRoutes } from "./server/routes";

const fastify = Fastify({
  pluginTimeout: 100000,
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
  ajv: {
    customOptions: {
      allErrors: true,
    },
  },
});

async function start() {
  try {
    registerErrorHandler(fastify);
    await registerPlugins(fastify);
    await registerRoutes(fastify);

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

const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start();
