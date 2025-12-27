import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireAdmin,
} from "../../../middleware/auth";
import {
  LocationParams,
  UpdateLocationBody,
  locationParamsSchema,
  updateLocationBodySchema,
} from "../../../schemas/locations";
import { supabaseAdmin } from "../../../services/supabase";

const updateLocationFastifySchema = {
  description: "Update an existing location (Admin only)",
  tags: ["admin", "locations"],
  security: [{ bearerAuth: [] }],
  params: locationParamsSchema,
  body: updateLocationBodySchema,
};

async function updateLocation(
  request: FastifyRequest<{ Params: LocationParams; Body: UpdateLocationBody }>,
  reply: FastifyReply
) {
  try {
    const { locationId } = request.params;

    const authenticatedRequest = request as AuthenticatedRequest;

    // Get validated request body (Fastify already validated)
    const updateData = request.body as Partial<UpdateLocationBody>;

    // Check if there's actually data to update
    if (Object.keys(updateData).length === 0) {
      throw new Error("No update data provided");
    }

    // Check if location exists
    const { data: existingLocation, error: fetchError } = await supabaseAdmin
      .from("locations")
      .select("id, name")
      .eq("id", locationId)
      .single();

    if (fetchError || !existingLocation) {
      throw fetchError || new Error("Location not found");
    }

    // Update location
    const { data: updatedLocation, error: updateError } = await supabaseAdmin
      .from("locations")
      .update({
        ...updateData,
        updated_by: authenticatedRequest.user?.id, // Set updated_by from authenticated user
      })
      .eq("id", locationId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return reply.send({
      success: true,
      message: "Location updated successfully",
      data: updatedLocation,
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
