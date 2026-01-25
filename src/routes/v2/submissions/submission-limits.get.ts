import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const submissionLimitsFastifySchema = {
  description: "Get user submission limits and current counts",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            max_pending_submissions: { type: "number" },
            current_pending_count: { type: "number" },
            max_daily_submissions: { type: "number" },
            current_daily_count: { type: "number" },
            can_submit: { type: "boolean" },
            next_submission_available: { type: "string" },
          },
        },
      },
    },
  },
};

async function getSubmissionLimits(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user.id;

    logger.info("Submission limits check", { userId });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get current pending submissions
    const { data: pendingSubmissions, error: pendingError } =
      await supabaseAdmin
        .from("location_submission_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending");

    if (pendingError) {
      throw pendingError;
    }

    // Get today's submissions
    const { data: todaySubmissions, error: todayError } = await supabaseAdmin
      .from("location_submission_requests")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    if (todayError) {
      throw todayError;
    }

    const currentPendingCount = pendingSubmissions?.length || 0;
    const currentDailyCount = todaySubmissions?.length || 0;

    // Define limits
    const maxPendingSubmissions = 5;
    const maxDailySubmissions = 10;

    const canSubmit =
      currentPendingCount < maxPendingSubmissions &&
      currentDailyCount < maxDailySubmissions;

    logger.info("Submission limits returned", {
      userId,
      pendingCount: currentPendingCount,
      dailyCount: currentDailyCount,
      canSubmit,
    });

    return reply.send({
      success: true,
      data: {
        max_pending_submissions: maxPendingSubmissions,
        current_pending_count: currentPendingCount,
        max_daily_submissions: maxDailySubmissions,
        current_daily_count: currentDailyCount,
        can_submit: canSubmit,
        next_submission_available: canSubmit ? "now" : tomorrow.toISOString(),
      },
    });
  } catch (error) {
    request.log.error("Error in getSubmissionLimits:", error);
    throw error;
  }
}

export default async function SubmissionLimitsGet(fastify: FastifyInstance) {
  fastify.get("/locations/submission-limits", {
    schema: submissionLimitsFastifySchema,
    preHandler: authenticateUser,
    handler: getSubmissionLimits,
  });
}
