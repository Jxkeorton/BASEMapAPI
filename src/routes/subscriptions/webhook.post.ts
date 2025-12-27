import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  RevenueCatWebhookBody,
  revenueCatWebhookBodySchema,
} from "../../schemas/subscriptions";
import { supabaseAdmin } from "../../services/supabase";

const webhookFastifySchema = {
  description: "RevenueCat webhook for subscription updates",
  tags: ["subscriptions"],
  body: revenueCatWebhookBodySchema,
};

async function prod(
  request: FastifyRequest<{ Body: RevenueCatWebhookBody }>,
  reply: FastifyReply
) {
  try {
    const body = request.body;
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
