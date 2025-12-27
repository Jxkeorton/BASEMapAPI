import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest, authenticateUser } from "../../middleware/auth";
import {
  CreateSubmissionBody,
  createSubmissionBodySchema,
} from "../../schemas/submissions";
import { supabaseAdmin } from "../../services/supabase";

const createSubmissionFastifySchema = {
  description: "Submit a new location or update request",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  body: createSubmissionBodySchema,
  response: {
    201: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { type: "string" },
            submission_type: { type: "string" },
          },
        },
      },
    },
  },
};

// Helper function to check submission limits
async function checkSubmissionLimits(
  userId: string
): Promise<{ canSubmit: boolean; reason?: string }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check pending submissions limit (max 5 pending)
  const { data: pendingSubmissions, error: pendingError } = await supabaseAdmin
    .from("location_submission_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (pendingError) {
    return { canSubmit: true }; // Allow if we can't check
  }

  if ((pendingSubmissions?.length || 0) >= 5) {
    return {
      canSubmit: false,
      reason:
        "You have reached the maximum of 5 pending submissions. Please wait for review.",
    };
  }

  // Check daily submissions limit (max 10 per day)
  const { data: todaySubmissions, error: todayError } = await supabaseAdmin
    .from("location_submission_requests")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  if (todayError) {
    return { canSubmit: true }; // Allow if we can't check
  }

  if ((todaySubmissions?.length || 0) >= 10) {
    return {
      canSubmit: false,
      reason:
        "You have reached the daily limit of 10 submissions. Please try again tomorrow.",
    };
  }

  return { canSubmit: true };
}

// Submit location request
async function createSubmission(
  request: FastifyRequest<{ Body: CreateSubmissionBody }>,
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const submissionData = request.body;

    const limitCheck = await checkSubmissionLimits(
      authenticatedRequest.user.id
    );
    if (!limitCheck.canSubmit) {
      throw new Error(limitCheck.reason || "Submission limit reached");
    }

    // If it's an update, verify the location exists
    if (submissionData.submission_type === "update") {
      if (!submissionData.existing_location_id) {
        throw new Error(
          "An existing location ID is required for update submissions"
        );
      }

      const { error: locationError } = await supabaseAdmin
        .from("locations")
        .select("id, name")
        .eq("id", submissionData.existing_location_id)
        .single();

      if (locationError) {
        throw locationError;
      }
    }

    // Insert submission request
    const submissionInsert = {
      user_id: authenticatedRequest.user.id,
      name: submissionData.name,
      country: submissionData.country,
      latitude: submissionData.latitude,
      longitude: submissionData.longitude,
      rock_drop_ft: submissionData.rock_drop_ft,
      total_height_ft: submissionData.total_height_ft,
      cliff_aspect: submissionData.cliff_aspect,
      anchor_info: submissionData.anchor_info,
      access_info: submissionData.access_info,
      notes: submissionData.notes,
      opened_by_name: submissionData.opened_by_name,
      opened_date: submissionData.opened_date,
      video_link: submissionData.video_link || null,
      submission_type: submissionData.submission_type,
      existing_location_id: submissionData.existing_location_id || null,
    };

    const { data: newSubmission, error: submissionError } = await supabaseAdmin
      .from("location_submission_requests")
      .insert([submissionInsert])
      .select()
      .single();

    if (submissionError) {
      throw submissionError;
    }

    // Insert images if provided
    if (submissionData.image_urls && submissionData.image_urls.length > 0) {
      const imageRecords = submissionData.image_urls.map((url, index) => ({
        submission_id: newSubmission.id,
        image_url: url,
        image_order: index,
      }));

      const { error: imageError } = await supabaseAdmin
        .from("location_submission_images")
        .insert(imageRecords);

      if (imageError) {
        request.log.error(
          "⚠️ Warning: Failed to save images:",
          imageError.message
        );
        throw imageError;
      } else {
        request.log.info(
          "✅ Saved",
          imageRecords.length,
          "images for submission"
        );
      }
    }

    return reply.code(201).send({
      success: true,
      message: "Location submission created successfully",
      data: {
        id: newSubmission.id,
        status: newSubmission.status,
        submission_type: newSubmission.submission_type,
      },
    });
  } catch (error) {
    request.log.error("Error in createSubmission:", error);
    throw error;
  }
}

export default async function SubmissionsPost(fastify: FastifyInstance) {
  fastify.post("/locations/submissions", {
    schema: createSubmissionFastifySchema,
    preHandler: authenticateUser,
    handler: createSubmission,
  });
}
