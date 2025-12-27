import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../../services/supabase";

// RevenueCat webhook validation schema
const revenueCatWebhookSchema = z.object({
  api_version: z.string(),
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    period_type: z.string().optional(),
    purchased_at_ms: z.number().optional(),
    expiration_at_ms: z.number().optional(),
    is_trial_period: z.boolean().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
  }),
});

type RevenueCatWebhookBody = z.infer<typeof revenueCatWebhookSchema>;

const webhookFastifySchema = {
  description: "RevenueCat webhook for subscription updates",
  tags: ["subscriptions"],
  body: {
    type: "object",
    required: ["api_version", "event"],
    properties: {
      api_version: { type: "string" },
      event: {
        type: "object",
        required: ["type", "app_user_id"],
        properties: {
          type: { type: "string", description: "Event type from RevenueCat" },
          app_user_id: { type: "string", description: "User ID from your app" },
          product_id: { type: "string" },
          period_type: { type: "string" },
          purchased_at_ms: { type: "number" },
          expiration_at_ms: { type: "number" },
          is_trial_period: { type: "boolean" },
          price: { type: "number" },
          currency: { type: "string" },
        },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Body: RevenueCatWebhookBody }>,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const body = revenueCatWebhookSchema.parse(request.body);
    const { event } = body;

    // Map RevenueCat event types to subscription statuses
    let subscriptionStatus: "free" | "trial" | "active" | "expired" = "free";
    let expirationDate: string | null = null;

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
        subscriptionStatus = event.is_trial_period ? "trial" : "active";
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        break;

      case "CANCELLATION":
        // User cancelled but still has access until expiration
        subscriptionStatus = "active";
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        break;

      case "EXPIRATION":
        subscriptionStatus = "expired";
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        break;

      case "UNCANCELLATION":
        subscriptionStatus = "active";
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        break;

      default:
        return reply.send({
          success: true,
          message: "Event type not processed",
        });
    }

    // Update user subscription in database using admin client
    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update({
        revenuecat_customer_id: event.app_user_id,
        subscription_status: subscriptionStatus,
        subscription_expires_at: expirationDate,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("id", event.app_user_id) // app_user_id should be the user's UUID
      .select("id, email")
      .single();

    if (error) {
      request.log.error("Error updating subscription from webhook:", error);
      throw error;
    }

    // Return simple response
    return reply.send({
      success: true,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    request.log.error("RevenueCat webhook error:", error);
    throw error;
  }
}

export default async function RevenueCatWebhookPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: RevenueCatWebhookBody;
  }>("/subscriptions/webhook", {
    schema: webhookFastifySchema,
    handler: prod,
  });
}
