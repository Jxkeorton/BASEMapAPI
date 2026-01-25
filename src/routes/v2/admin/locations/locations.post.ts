import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireAdmin,
} from "../../../../middleware/auth";
import {
  CreateLocationBody,
  createLocationBodySchema,
} from "../../../../schemas/locations";
import { logger } from "../../../../services/logger";
import { supabaseAdmin } from "../../../../services/supabase";

const createLocationFastifySchema = {
  description: "Create a new BASE jumping location (Admin only)",
  tags: ["admin", "locations"],
  security: [{ bearerAuth: [] }],
  body: createLocationBodySchema,
};

// Create new location (Admin+ only)
async function createLocation(
  request: FastifyRequest<{ Body: CreateLocationBody }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const locationData = request.body;

    logger.info("Admin location creation", {
      adminUserId: authenticatedRequest.user.id,
      locationName: locationData.name,
      country: locationData.country,
    });

    // Insert into database
    const { data: newLocation, error } = await supabaseAdmin
      .from("locations")
      .insert([
        {
          ...locationData,
          created_by: authenticatedRequest.user?.id,
          updated_by: authenticatedRequest.user?.id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info("Admin location created", {
      adminUserId: authenticatedRequest.user.id,
      locationId: newLocation.id,
      locationName: newLocation.name,
    });

    return reply.code(201).send({
      success: true,
      message: "Location created successfully",
      data: newLocation,
    });
  } catch (error) {
    request.log.error("Error in createLocation:", error);
    throw error;
  }
}

export default async function LocationsPost(fastify: FastifyInstance) {
  fastify.post("/admin/locations", {
    schema: createLocationFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: createLocation,
  });
}
