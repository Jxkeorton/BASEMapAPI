import { FastifyInstance } from "fastify";
import AdminLocationsRoutes from "../routes/admin/locations";
import AdminSubmissionsRoutes from "../routes/admin/submissions";
import AuthRoutes from "../routes/auth";
import SubmissionRoutes from "../routes/submissions";

export async function registerRoutes(fastify: FastifyInstance) {
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
  await fastify.register(import("../routes/locations/locations.get"));
  await fastify.register(import("../routes/locations/save.post"));
  await fastify.register(import("../routes/locations/unsave.delete"));
  await fastify.register(import("../routes/locations/saved.get"));

  // Auth routes
  await fastify.register(AuthRoutes);

  // Profile routes
  await fastify.register(import("../routes/profile/profile.get"));
  await fastify.register(import("../routes/profile/profile.patch"));

  // Subscription routes
  await fastify.register(import("../routes/subscriptions/webhook.post"));
  await fastify.register(import("../routes/subscriptions/restore.post"));

  // Logbook routes
  await fastify.register(import("../routes/logbook/logbook.post"));
  await fastify.register(import("../routes/logbook/logbook.patch"));
  await fastify.register(import("../routes/logbook/logbook.get"));
  await fastify.register(import("../routes/logbook/logbook.delete"));
}
