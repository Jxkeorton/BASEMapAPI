import { FastifyInstance } from 'fastify';
import LocationsPost from './locations.post';
import LocationsPatch from './locations.patch';
import LocationsDelete from './locations.delete';

export default async function AdminLocationsRoutes(fastify: FastifyInstance) {
  await fastify.register(LocationsPost);
  await fastify.register(LocationsPatch);
  await fastify.register(LocationsDelete);
}