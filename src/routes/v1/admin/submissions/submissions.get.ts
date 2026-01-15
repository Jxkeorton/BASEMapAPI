import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticateUser, requireAdmin } from "../../../../middleware/auth";
import {
  AdminSubmissionsQuery,
  adminSubmissionsQuerySchema,
} from "../../../../schemas/submissions";
import { supabaseAdmin } from "../../../../services/supabase";

const submissionsFastifySchema = {
  description: "Get all location submissions for admin review",
  tags: ["admin", "submissions"],
  security: [{ bearerAuth: [] }],
  querystring: adminSubmissionsQuerySchema,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            submissions: { type: "array" },
            total_count: { type: "number" },
            has_more: { type: "boolean" },
            summary: {
              type: "object",
              properties: {
                pending: { type: "number" },
                approved: { type: "number" },
                rejected: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

async function getSubmissions(
  request: FastifyRequest<{ Querystring: AdminSubmissionsQuery }>,
  reply: FastifyReply
) {
  try {
    const {
      status,
      submission_type,
      user_id,
      limit = 50,
      offset = 0,
      sort_by = "created_at",
      sort_order = "desc",
    } = request.query;

    let supabaseQuery = supabaseAdmin.from("location_submission_requests")
      .select(`
        id,
        user_id,
        name,
        country,
        latitude,
        longitude,
        rock_drop_ft,
        total_height_ft,
        cliff_aspect,
        anchor_info,
        access_info,
        notes,
        opened_by_name,
        opened_date,
        video_link,
        status,
        submission_type,
        existing_location_id,
        admin_notes,
        created_at,
        updated_at,
        reviewed_at,
        reviewed_by,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        existing_location:existing_location_id (
          id,
          name,
          country
        ),
        location_submission_images (
          id,
          image_url,
          image_order
        )
      `);

    // Apply filters
    if (status) {
      supabaseQuery = supabaseQuery.eq("status", status);
    }

    if (submission_type) {
      supabaseQuery = supabaseQuery.eq("submission_type", submission_type);
    }

    if (user_id) {
      supabaseQuery = supabaseQuery.eq("user_id", user_id);
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(sort_by, {
      ascending: sort_order === "asc",
    });

    // Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data: submissions, error } = await supabaseQuery;

    if (error) {
      request.log.error("Error fetching submissions:", error);
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from("location_submission_requests")
      .select("*", { count: "exact", head: true });

    // Apply same filters for count
    if (status) {
      countQuery = countQuery.eq("status", status);
    }
    if (submission_type) {
      countQuery = countQuery.eq("submission_type", submission_type);
    }
    if (user_id) {
      countQuery = countQuery.eq("user_id", user_id);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      request.log.warn({
        msg: "Error getting total count",
        error: countError.message,
      });
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from("location_submission_requests")
      .select("status");

    let summary = { pending: 0, approved: 0, rejected: 0 };
    if (!summaryError && summaryData) {
      summary = summaryData.reduce(
        (acc, submission) => {
          const status = submission.status as keyof typeof acc;
          if (status in acc) {
            acc[status] = (acc[status] || 0) + 1;
          }
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 }
      );
    }

    const hasMore = (totalCount || 0) > offset + limit;

    return reply.send({
      success: true,
      data: {
        submissions: submissions || [],
        total_count: totalCount || 0,
        has_more: hasMore,
        summary,
      },
    });
  } catch (error) {
    request.log.error("Error in submissions endpoint:", error);
    throw error;
  }
}

export default async function SubmissionsGet(fastify: FastifyInstance) {
  fastify.get("/admin/submissions", {
    schema: submissionsFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: getSubmissions,
  });
}
