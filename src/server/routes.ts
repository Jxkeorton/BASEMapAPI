import autoload from "@fastify/autoload";
import { FastifyInstance } from "fastify";
import { join } from "path";

export async function registerRoutes(fastify: FastifyInstance) {
  const routesDir = join(__dirname, "../routes");

  // Register API v1 routes with /api/v1 prefix
  await fastify.register(
    async (v1Instance) => {
      await v1Instance.register(autoload, {
        dir: join(routesDir, "v1"),
        dirNameRoutePrefix: false,
        options: {},
      });
    },
    { prefix: "/api/v1" }
  );

  // Register API v2 routes with /api/v2 prefix
  await fastify.register(
    async (v2Instance) => {
      await v2Instance.register(autoload, {
        dir: join(routesDir, "v2"),
        dirNameRoutePrefix: false,
        options: {},
      });
    },
    { prefix: "/api/v2" }
  );
}
