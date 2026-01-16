import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireSuperuser,
} from "../../../../middleware/auth";
import {
  LocationParams,
  locationParamsSchema,
} from "../../../../schemas/locations";
import { logger } from "../../../../services/logger";
import { supabaseAdmin } from "../../../../services/supabase";

const deleteLocationFastifySchema = {
  description: "Delete a location (Superuser only)",
  tags: ["admin", "locations"],
  security: [{ bearerAuth: [] }],
  params: locationParamsSchema,
};

// Delete location (Superuser only)
async function deleteLocation(
  request: FastifyRequest<{ Params: LocationParams }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { locationId } = request.params;

    logger.info("Admin location deletion requested", {
      adminUserId: authenticatedRequest.user.id,
      locationId,
    });

    // Check if location exists and get its name for logging
    const { data: existingLocation, error: fetchError } = await supabaseAdmin
      .from("locations")
      .select("id, name")
      .eq("id", locationId)
      .single();

    if (fetchError || !existingLocation) {
      throw fetchError || new Error("Location not found");
    }

    // Check if location has any dependencies (saved locations, logbook entries, etc.)
    // This prevents deletion if users have data tied to this location
    const { data: savedLocations, error: savedError } = await supabaseAdmin
      .from("user_saved_locations")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId);

    if (savedError) {
      request.log.warn("Error checking dependencies:", savedError);
    }

    if (savedLocations && savedLocations.length > 0) {
      request.log.warn(
        `Warning: Location has ${savedLocations.length} saved references`,
      );
    }

    // Delete location
    const { error: deleteError } = await supabaseAdmin
      .from("locations")
      .delete()
      .eq("id", locationId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info("Admin location deleted", {
      adminUserId: authenticatedRequest.user.id,
      locationId,
      locationName: existingLocation.name,
    });

    return reply.send({
      success: true,
      message: `Location "${existingLocation.name}" deleted successfully`,
      data: {
        deleted_location: {
          id: existingLocation.id,
          name: existingLocation.name,
        },
      },
    });
  } catch (error) {
    request.log.error("Error in deleteLocation:", error);
    throw error;
  }
}

export default async function LocationsDelete(fastify: FastifyInstance) {
  fastify.delete("/admin/locations/:locationId", {
    schema: deleteLocationFastifySchema,
    preHandler: [authenticateUser, requireSuperuser],
    handler: deleteLocation,
  });
}
