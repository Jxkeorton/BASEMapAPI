import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { signOutFastifySchema } from "../../../schemas/auth/signout";
import { logger } from "../../../services/logger";
import { supabaseClient } from "../../../services/supabase";

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    logger.info("User signout initiated", {
      userId: authenticatedRequest.user?.id,
    });

    // Sign out with Supabase
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      request.log.error("Error signing out:", error);
      throw error;
    }

    logger.info("User signout successful", {
      userId: authenticatedRequest.user?.id,
    });

    // Return simple response
    return reply.send({
      success: true,
      message: "Successfully signed out",
    });
  } catch (error) {
    request.log.error("Error in signout endpoint:", error);
    throw error;
  }
}

export default async function SignOutPost(fastify: FastifyInstance) {
  fastify.post("/signout", {
    schema: signOutFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
