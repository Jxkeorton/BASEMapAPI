import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { UnsaveLocationBody } from "../../../schemas/locations";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const unsaveLocationFastifySchema = {
  description: "Remove a location from user favorites",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["location_id"],
    properties: {
      location_id: {
        type: "number",
        description: "ID of the location to unsave",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Body: UnsaveLocationBody }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const { location_id } = request.body;

    logger.info("Location unsave requested", {
      userId: authenticatedRequest.user.id,
      locationId: location_id,
    });

    // Get the location name for response message
    const { data: location, error: locationError } = await supabaseAdmin
      .from("locations")
      .select("id, name")
      .eq("id", location_id)
      .single();

    if (locationError || !location) {
      throw locationError || new Error("Location not found");
    }

    // Remove the saved location
    const { error } = await supabaseAdmin
      .from("user_saved_locations")
      .delete()
      .eq("user_id", authenticatedRequest.user.id)
      .eq("location_id", location_id)
      .select("id")
      .single();

    if (error) {
      request.log.error("Error unsaving location:", error);
      throw error;
    }

    logger.info("Location unsaved", {
      userId: authenticatedRequest.user.id,
      locationId: location_id,
      locationName: location.name,
    });

    return reply.send({
      success: true,
      message: `Location "${location.name}" removed from favorites`,
    });
  } catch (error) {
    request.log.error("Error in unsave location endpoint:", error);
    throw error;
  }
}

export default async function UnsaveLocationDelete(fastify: FastifyInstance) {
  fastify.delete("/locations/unsave", {
    schema: unsaveLocationFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
