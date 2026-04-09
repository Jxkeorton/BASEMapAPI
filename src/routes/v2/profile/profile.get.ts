import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { ProfileResponseData } from "../../../schemas/profile";
import { supabaseAdmin } from "../../../services/supabase";

const profileFastifySchema = {
  description: "Get current user profile with role information",
  tags: ["auth"],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: ProfileResponseData,
      },
    },
  },
};

async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    // Profile should already be attached by authenticateUser middleware
    if (authenticatedRequest.profile) {
      return reply.send({
        success: true,
        data: authenticatedRequest.profile,
      });
    }

    // Fallback: fetch profile with image if not cached
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        *,
        profile_images (
          image_url
        )
      `,
      )
      .eq("id", authenticatedRequest.user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Extract image_url from the single profile_images object
    const profileWithImage = {
      ...profile,
      image_url: (profile.profile_images as any)?.image_url || null,
      profile_images: undefined,
    };

    return reply.send({
      success: true,
      data: profileWithImage,
    });
  } catch (error) {
    request.log.error("Error in profile endpoint:", error);
    throw error;
  }
}

export default async function ProfileGet(fastify: FastifyInstance) {
  fastify.get("/profile", {
    schema: profileFastifySchema,
    preHandler: authenticateUser,
    handler: getProfile,
  });
}
