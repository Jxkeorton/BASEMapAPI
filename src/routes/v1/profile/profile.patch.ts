import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import {
  UpdateProfileBody,
  updateProfileBodySchema,
} from "../../../schemas/profile";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const updateProfileFastifySchema = {
  description: "Update current user profile",
  tags: ["profile"],
  security: [{ bearerAuth: [] }],
  body: updateProfileBodySchema,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string", nullable: true },
            username: { type: "string", nullable: true },
            jump_number: { type: "number" },
            updated_at: { type: "string" },
          },
        },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Body: UpdateProfileBody }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const updates = request.body as Partial<UpdateProfileBody>;

    logger.info("Profile update requested", {
      userId: authenticatedRequest.user.id,
      fields: Object.keys(updates),
    });

    // Validate at least one field is provided
    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({
        success: false,
        error: "At least one field must be provided for update",
      });
    }

    // Check if username is being updated and is already taken
    if (updates.username) {
      const { data: existingUser, error: usernameError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", updates.username)
        .neq("id", authenticatedRequest.user.id)
        .single();

      if (existingUser && !usernameError) {
        return reply.code(400).send({
          success: false,
          error: "Username already taken",
        });
      }

      if (usernameError && usernameError.code !== "PGRST116") {
        return reply.code(500).send({
          success: false,
          error: "Failed to verify username availability",
        });
      }
    }

    // Update profile in database
    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authenticatedRequest.user.id)
      .select("id, email, name, username, jump_number, updated_at")
      .single();

    if (error) {
      request.log.error("Error updating profile:", error);
      throw error;
    }

    logger.info("Profile updated", {
      userId: authenticatedRequest.user.id,
      updatedFields: Object.keys(updates),
    });

    // Return simple response
    return reply.send({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    request.log.error("Error in profile update endpoint:", error);
    throw error;
  }
}

export default async function ProfilePatch(fastify: FastifyInstance) {
  fastify.patch("/profile", {
    schema: updateProfileFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
