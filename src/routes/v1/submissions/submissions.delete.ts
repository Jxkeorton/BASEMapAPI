import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const deleteSubmissionFastifySchema = {
  description: "Delete a pending submission",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
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

async function deleteSubmission(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { id } = request.params;

    logger.info("Submission deletion requested", {
      userId: authenticatedRequest.user.id,
      submissionId: id,
    });

    // Check if submission exists and belongs to user and is pending
    const { error: fetchError } = await supabaseAdmin
      .from("location_submission_requests")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", authenticatedRequest.user.id)
      .eq("status", "pending")
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Delete the submission (images will be cascade deleted due to foreign key)
    const { error: deleteError } = await supabaseAdmin
      .from("location_submission_requests")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    logger.info("Submission deleted", {
      userId: authenticatedRequest.user.id,
      submissionId: id,
    });

    return reply.send({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    request.log.error("Error in deleteSubmission:", error);
    throw error;
  }
}

export default async function SubmissionsDelete(fastify: FastifyInstance) {
  fastify.delete("/locations/submissions/:id", {
    schema: deleteSubmissionFastifySchema,
    preHandler: authenticateUser,
    handler: deleteSubmission,
  });
}
