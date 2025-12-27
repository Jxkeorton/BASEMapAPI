import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireAdmin,
} from "../../../middleware/auth";
import {
  ReviewSubmissionBody,
  SubmissionParams,
  reviewSubmissionBodySchema,
  submissionParamsSchema,
} from "../../../schemas/submissions";
import { supabaseAdmin } from "../../../services/supabase";

const reviewSubmissionFastifySchema = {
  description: "Review a location submission (approve or reject)",
  tags: ["admin", "submissions"],
  security: [{ bearerAuth: [] }],
  params: submissionParamsSchema,
  body: reviewSubmissionBodySchema,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            submission: { type: "object" },
            created_location: { type: "object" },
            updated_location: { type: "object" },
          },
        },
      },
    },
  },
};

async function reviewSubmission(
  request: FastifyRequest<{
    Params: SubmissionParams;
    Body: ReviewSubmissionBody;
  }>,
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { submissionId } = request.params;
    const reviewData = request.body;

    // First, get the submission with all related data
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("location_submission_requests")
      .select(
        `
        *,
        location_submission_images (
          id,
          image_url,
          image_order
        ),
        existing_location:existing_location_id (
          id,
          name,
          country
        )
      `
      )
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      throw fetchError || new Error("Submission not found");
    }

    // Check if submission is still pending
    if (submission.status !== "pending") {
      throw new Error(`Submission already ${submission.status}`);
    }

    let createdLocation = null;
    let updatedLocation = null;

    // If approved, create or update the location
    if (reviewData.status === "approved") {
      // Prepare location data (use override_data if provided, otherwise submission data)
      const locationData = {
        name: reviewData.override_data?.name || submission.name,
        country: reviewData.override_data?.country || submission.country,
        latitude: reviewData.override_data?.latitude || submission.latitude,
        longitude: reviewData.override_data?.longitude || submission.longitude,
        rock_drop_ft:
          reviewData.override_data?.rock_drop_ft || submission.rock_drop_ft,
        total_height_ft:
          reviewData.override_data?.total_height_ft ||
          submission.total_height_ft,
        cliff_aspect:
          reviewData.override_data?.cliff_aspect || submission.cliff_aspect,
        anchor_info:
          reviewData.override_data?.anchor_info || submission.anchor_info,
        access_info:
          reviewData.override_data?.access_info || submission.access_info,
        notes: reviewData.override_data?.notes || submission.notes,
        opened_by_name:
          reviewData.override_data?.opened_by_name || submission.opened_by_name,
        opened_date:
          reviewData.override_data?.opened_date || submission.opened_date,
        video_link:
          reviewData.override_data?.video_link || submission.video_link,
      };

      if (submission.submission_type === "new") {
        // Create new location
        const { data: newLocation, error: createError } = await supabaseAdmin
          .from("locations")
          .insert([locationData])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        createdLocation = newLocation;
      } else if (
        submission.submission_type === "update" &&
        submission.existing_location_id
      ) {
        // Update existing location
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("locations")
          .update(locationData)
          .eq("id", submission.existing_location_id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        updatedLocation = updated;
      }
    }

    // Update the submission status
    const { data: updatedSubmission, error: updateError } = await supabaseAdmin
      .from("location_submission_requests")
      .update({
        status: reviewData.status,
        admin_notes: reviewData.admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authenticatedRequest.user.id,
      })
      .eq("id", submissionId)
      .select(
        `
        *,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        location_submission_images (
          id,
          image_url,
          image_order
        )
      `
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    const message =
      reviewData.status === "approved"
        ? `Submission approved${
            createdLocation
              ? " and location created"
              : updatedLocation
              ? " and location updated"
              : ""
          }`
        : "Submission rejected";

    return reply.send({
      success: true,
      message,
      data: {
        submission: updatedSubmission,
        ...(createdLocation && { created_location: createdLocation }),
        ...(updatedLocation && { updated_location: updatedLocation }),
      },
    });
  } catch (error) {
    request.log.error("Error in reviewSubmission:", error);
    throw error;
  }
}

export default async function SubmissionsPatch(fastify: FastifyInstance) {
  fastify.patch("/admin/submissions/:submissionId", {
    schema: reviewSubmissionFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: reviewSubmission,
  });
}
