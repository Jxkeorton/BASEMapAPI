import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import {
  GetSubmissionsQuery,
  SubmissionsResponseData,
  getSubmissionsQuerySchema,
} from "../../../schemas/submissions";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const getSubmissionsFastifySchema = {
  description: "Get user submission requests",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  querystring: getSubmissionsQuerySchema,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: SubmissionsResponseData,
      },
    },
  },
};

async function getUserSubmissions(
  request: FastifyRequest<{ Querystring: GetSubmissionsQuery }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { status, submission_type, limit = 20, offset = 0 } = request.query;

    logger.info("User submissions fetch", {
      userId: authenticatedRequest.user.id,
      filters: { status, submission_type },
    });

    // Build query
    let supabaseQuery = supabaseAdmin
      .from("location_submission_requests")
      .select(
        `
        *,
        location_submission_images(image_url, image_order),
        locations(name)
      `,
      )
      .eq("user_id", authenticatedRequest.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      supabaseQuery = supabaseQuery.eq("status", status);
    }

    if (submission_type) {
      supabaseQuery = supabaseQuery.eq("submission_type", submission_type);
    }

    const { data: submissions, error } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from("location_submission_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authenticatedRequest.user.id);

    if (status) countQuery = countQuery.eq("status", status);
    if (submission_type)
      countQuery = countQuery.eq("submission_type", submission_type);

    const { count, error: countError } = await countQuery;

    if (countError) {
      request.log.error("⚠️ Error getting total count:", countError.message);
      throw error;
    }

    // Transform data to flatten structure and sort images
    const transformedSubmissions = (submissions || []).map((submission) => ({
      ...submission,
      images: (submission.location_submission_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url),
      existing_location_name: submission.locations?.name || null,
      // Remove the nested objects from response
      location_submission_images: undefined,
      locations: undefined,
    }));

    const hasMore = (count || 0) > offset + limit;

    logger.info("User submissions returned", {
      userId: authenticatedRequest.user.id,
      count: transformedSubmissions.length,
      totalCount: count,
    });

    return reply.send({
      success: true,
      data: {
        submissions: transformedSubmissions,
        total_count: count || 0,
        has_more: hasMore,
      },
    });
  } catch (error) {
    request.log.error("Error in getUserSubmissions:", error);
    throw error;
  }
}

export default async function SubmissionsGet(fastify: FastifyInstance) {
  fastify.get("/locations/submissions", {
    schema: getSubmissionsFastifySchema,
    preHandler: authenticateUser,
    handler: getUserSubmissions,
  });
}
