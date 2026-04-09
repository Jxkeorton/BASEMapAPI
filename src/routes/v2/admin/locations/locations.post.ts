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
import {
  getLocationImages,
  MAX_LOCATION_IMAGES,
  updateLocationImages,
} from "../../../../services/locationImages";
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

    const { images, ...locationData } = request.body;

    // Validate max 5 images
    if (images && images.length > MAX_LOCATION_IMAGES) {
      return reply.code(400).send({
        success: false,
        error: `Maximum ${MAX_LOCATION_IMAGES} images allowed per location`,
      });
    }

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

    // Insert images if provided
    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      await updateLocationImages(newLocation.id, images);
      imageUrls = await getLocationImages(newLocation.id);
    }

    // Audit log
    await supabaseAdmin.from("location_audit_log").insert([
      {
        location_id: newLocation.id,
        action: "created",
        performed_by: authenticatedRequest.user.id,
        location_snapshot: newLocation,
        source: "admin",
      },
    ]);

    logger.info("Admin location created", {
      adminUserId: authenticatedRequest.user.id,
      locationId: newLocation.id,
      locationName: newLocation.name,
    });

    return reply.code(201).send({
      success: true,
      message: "Location created successfully",
      data: {
        ...newLocation,
        images: imageUrls,
      },
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
