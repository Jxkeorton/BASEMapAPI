import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { appConfig } from './config';

const fastify = Fastify({
  logger: {
    level: appConfig.logging.level,
    ...(appConfig.nodeEnv === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    }),
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(helmet);
    
    await fastify.register(cors, {
      origin: appConfig.api.corsOrigin,
      credentials: true,
    });

    await fastify.register(rateLimit, {
      max: appConfig.rateLimit.max,
      timeWindow: appConfig.rateLimit.timeWindow,
    });

    // Swagger documentation
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'BASE Map API',
          description: 'API for BASE jumping locations and user management',
          version: '1.0.0',
        },
        servers: [{
          url: `http://${appConfig.host}:${appConfig.port}`,
          description: 'Development server',
        }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(import('./routes/locations.get'), { prefix: `/api/${appConfig.api.version}` });
    
    // Add auth routes
    await fastify.register(import('./routes/signIn.post'), { prefix: `/api/${appConfig.api.version}` });
    await fastify.register(import('./routes/signUp.post'), { prefix: `/api/${appConfig.api.version}` });
     await fastify.register(import('./routes/profile.get'), { prefix: `/api/${appConfig.api.version}` });

    // Start server
    await fastify.listen({
      host: appConfig.host,
      port: appConfig.port,
    });

    fastify.log.info(`🚀 Server listening on http://${appConfig.host}:${appConfig.port}`);
    fastify.log.info(`📚 API Documentation available at http://${appConfig.host}:${appConfig.port}/docs`);
    
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

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();