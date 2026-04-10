import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import {
  UpdateSubmissionUserBody,
  updateSubmissionUserBodySchema,
} from "../../../schemas/submissions";
import { logger } from "../../../services/logger";
import {
  getSubmissionImages,
  MAX_SUBMISSION_IMAGES,
  updateSubmissionImages,
} from "../../../services/submissionImages";
import { supabaseAdmin } from "../../../services/supabase";

const updateSubmissionFastifySchema = {
  description: "Update a pending submission",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
  body: updateSubmissionUserBodySchema,
};

async function updateSubmission(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateSubmissionUserBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { id } = request.params;
    const updateData = request.body as Partial<UpdateSubmissionUserBody>;

    // Validate max 5 images if provided
    if (
      updateData.image_urls &&
      updateData.image_urls.length > MAX_SUBMISSION_IMAGES
    ) {
      return reply.code(400).send({
        success: false,
        error: `Maximum ${MAX_SUBMISSION_IMAGES} images allowed per submission`,
      });
    }

    logger.info("Submission update requested", {
      userId: authenticatedRequest.user.id,
      submissionId: id,
      fields: Object.keys(updateData),
    });

    // Check if submission exists and belongs to user and is pending
    const { error: fetchError } = await supabaseAdmin
      .from("location_submission_requests")
      .select("*")
      .eq("id", id)
      .eq("user_id", authenticatedRequest.user.id)
      .eq("status", "pending")
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Prepare update object (only include provided fields)
    const submissionUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    // Add only the fields that were provided
    Object.keys(updateData).forEach((key) => {
      if (
        key !== "image_urls" &&
        updateData[key as keyof UpdateSubmissionUserBody] !== undefined
      ) {
        submissionUpdate[key] =
          updateData[key as keyof UpdateSubmissionUserBody];
      }
    });

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabaseAdmin
      .from("location_submission_requests")
      .update(submissionUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Handle image updates if provided
    if (updateData.image_urls !== undefined) {
      const success = await updateSubmissionImages(id, updateData.image_urls);
      if (!success) {
        request.log.error("⚠️ Warning: Failed to update images for submission");
      }
    }

    // Fetch updated images for response
    const images = await getSubmissionImages(id);

    logger.info("Submission updated", {
      userId: authenticatedRequest.user.id,
      submissionId: id,
    });

    return reply.send({
      success: true,
      message: "Submission updated successfully",
      data: {
        ...updatedSubmission,
        images,
      },
    });
  } catch (error) {
    request.log.error("Error in updateSubmission:", error);
    throw error;
  }
}

export default async function SubmissionsPatch(fastify: FastifyInstance) {
  fastify.patch("/locations/submissions/:id", {
    schema: updateSubmissionFastifySchema,
    preHandler: authenticateUser,
    handler: updateSubmission,
  });
}
