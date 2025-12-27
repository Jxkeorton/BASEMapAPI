import { FastifyInstance } from "fastify";
import LocationsDelete from "./locations.delete";
import LocationsPatch from "./locations.patch";
import LocationsPost from "./locations.post";

export default async function AdminLocationsRoutes(fastify: FastifyInstance) {
  await fastify.register(LocationsPost);
  await fastify.register(LocationsPatch);
  await fastify.register(LocationsDelete);
}
