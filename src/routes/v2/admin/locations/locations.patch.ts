import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireAdmin,
} from "../../../../middleware/auth";
import {
  LocationParams,
  locationParamsSchema,
  UpdateLocationBody,
  updateLocationBodySchema,
} from "../../../../schemas/locations";
import {
  getLocationImages,
  MAX_LOCATION_IMAGES,
  updateLocationImages,
} from "../../../../services/locationImages";
import { logger } from "../../../../services/logger";
import { supabaseAdmin } from "../../../../services/supabase";

const updateLocationFastifySchema = {
  description: "Update an existing location (Admin only)",
  tags: ["admin", "locations"],
  security: [{ bearerAuth: [] }],
  params: locationParamsSchema,
  body: updateLocationBodySchema,
};

async function updateLocation(
  request: FastifyRequest<{ Params: LocationParams; Body: UpdateLocationBody }>,
  reply: FastifyReply,
) {
  try {
    const { locationId } = request.params;

    const authenticatedRequest = request as AuthenticatedRequest;

    // Separate images from other update data
    const { images, ...updateData } =
      request.body as Partial<UpdateLocationBody>;

    // Validate max 5 images if provided
    if (images && images.length > MAX_LOCATION_IMAGES) {
      return reply.code(400).send({
        success: false,
        error: `Maximum ${MAX_LOCATION_IMAGES} images allowed per location`,
      });
    }

    logger.info("Admin location update requested", {
      adminUserId: authenticatedRequest.user.id,
      locationId,
      fields: Object.keys(request.body),
    });

    // Check if there's actually data to update
    if (Object.keys(updateData).length === 0 && images === undefined) {
      throw new Error("No update data provided");
    }

    // Check if location exists and capture pre-update snapshot
    const { data: existingLocation, error: fetchError } = await supabaseAdmin
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (fetchError || !existingLocation) {
      throw fetchError || new Error("Location not found");
    }

    // Handle images update if provided
    if (images !== undefined) {
      await updateLocationImages(locationId, images);
    }

    // Update location if there are fields to update
    let updatedLocation;
    if (Object.keys(updateData).length > 0) {
      const { data, error: updateError } = await supabaseAdmin
        .from("locations")
        .update({
          ...updateData,
          updated_by: authenticatedRequest.user?.id,
        })
        .eq("id", locationId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      updatedLocation = data;
    } else {
      // Fetch current location if only images were updated
      const { data, error } = await supabaseAdmin
        .from("locations")
        .select()
        .eq("id", locationId)
        .single();

      if (error) {
        throw error;
      }
      updatedLocation = data;
    }

    // Fetch updated images
    const imageUrls = await getLocationImages(locationId);

    // Audit log
    const changedFields = Object.keys(request.body);
    const { error: auditError } = await supabaseAdmin
      .from("location_audit_log")
      .insert([
        {
          location_id: locationId,
          action: "updated",
          performed_by: authenticatedRequest.user.id,
          location_snapshot: existingLocation,
          source: "admin",
          notes: `Updated fields: ${changedFields.join(", ")}`,
        },
      ]);

    if (auditError) {
      logger.error("Failed to write audit log for location update", {
        locationId,
        error: auditError,
      });
    }

    logger.info("Admin location updated", {
      adminUserId: authenticatedRequest.user.id,
      locationId,
      locationName: updatedLocation.name,
    });

    return reply.send({
      success: true,
      message: "Location updated successfully",
      data: {
        ...updatedLocation,
        images: imageUrls,
      },
    });
  } catch (error) {
    request.log.error("Error in updateLocation:", error);
    throw error;
  }
}

export default async function LocationsPatch(fastify: FastifyInstance) {
  fastify.patch("/admin/locations/:locationId", {
    schema: updateLocationFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: updateLocation,
  });
}
