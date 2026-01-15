import autoload from "@fastify/autoload";
import { FastifyInstance } from "fastify";
import { join } from "path";

// test ruleset
export async function registerRoutes(fastify: FastifyInstance) {
  const routesDir = join(__dirname, "../routes");
  
  await fastify.register(autoload, {
    dir: routesDir,
    dirNameRoutePrefix: false, 
    options: {},
  });
}
