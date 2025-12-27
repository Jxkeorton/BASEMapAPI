import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest, authenticateUser } from "../../middleware/auth";
import {
  UpdateSubmissionUserBody,
  updateSubmissionUserBodySchema,
} from "../../schemas/submissions";
import { supabaseAdmin } from "../../services/supabase";

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
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { id } = request.params;
    const updateData = request.body as Partial<UpdateSubmissionUserBody>;

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
      // Delete existing images
      const { error: deleteError } = await supabaseAdmin
        .from("location_submission_images")
        .delete()
        .eq("submission_id", id);

      if (deleteError) {
        request.log.error(
          "⚠️ Warning: Failed to delete old images:",
          deleteError.message
        );
        throw deleteError;
      }

      // Insert new images
      if (updateData.image_urls.length > 0) {
        const imageRecords = updateData.image_urls.map((url, index) => ({
          submission_id: id,
          image_url: url,
          image_order: index,
        }));

        const { error: imageError } = await supabaseAdmin
          .from("location_submission_images")
          .insert(imageRecords);

        if (imageError) {
          request.log.error(
            "⚠️ Warning: Failed to save new images:",
            imageError.message
          );
          throw imageError;
        } else {
          request.log.info(
            "✅ Updated",
            imageRecords.length,
            "images for submission"
          );
        }
      }
    }

    return reply.send({
      success: true,
      message: "Submission updated successfully",
      data: updatedSubmission,
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
