import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest, authenticateUser } from "../../../middleware/auth";
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

    // Fallback: fetch profile if not cached
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authenticatedRequest.user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    return reply.send({
      success: true,
      data: profile,
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
