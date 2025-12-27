import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthenticatedRequest, authenticateUser } from "../../middleware/auth";
import { supabaseAdmin } from "../../services/supabase";

const restoreSubscriptionBodySchema = z.object({
  revenuecat_customer_id: z
    .string()
    .min(1, "RevenueCat customer ID is required"),
  subscription_status: z.enum(["free", "trial", "active", "expired"]),
  subscription_expires_at: z.string().datetime().optional(),
  subscription_product_id: z.string().optional(),
});

type RestoreSubscriptionBody = z.infer<typeof restoreSubscriptionBodySchema>;

const restoreSubscriptionFastifySchema = {
  description: "Restore user subscription from RevenueCat",
  tags: ["subscriptions"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["revenuecat_customer_id", "subscription_status"],
    properties: {
      revenuecat_customer_id: {
        type: "string",
        description: "RevenueCat customer ID",
      },
      subscription_status: {
        type: "string",
        enum: ["free", "trial", "active", "expired"],
        description: "Current subscription status",
      },
      subscription_expires_at: {
        type: "string",
        format: "date-time",
        description: "Subscription expiration date",
      },
      subscription_product_id: {
        type: "string",
        description: "Product ID (monthly/annual)",
      },
    },
  },
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const body = restoreSubscriptionBodySchema.parse(request.body);

    // Check if this RevenueCat customer ID is already linked to another user
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("revenuecat_customer_id", body.revenuecat_customer_id)
      .neq("id", authenticatedRequest.user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingUser) {
      throw new Error("This subscription is already linked to another account");
    }

    // Update user's subscription information
    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update({
        revenuecat_customer_id: body.revenuecat_customer_id,
        subscription_status: body.subscription_status,
        subscription_expires_at: body.subscription_expires_at || null,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("id", authenticatedRequest.user.id)
      .select(
        "id, email, subscription_status, subscription_expires_at, revenuecat_customer_id"
      )
      .single();

    if (error) {
      request.log.error("Error updating subscription:", error);
      throw error;
    }

    // Return simple response
    return reply.send({
      success: true,
      data: {
        user_id: updatedProfile.id,
        revenuecat_customer_id: updatedProfile.revenuecat_customer_id,
        subscription_status: updatedProfile.subscription_status,
        subscription_expires_at: updatedProfile.subscription_expires_at,
      },
      message: "Subscription restored successfully",
    });
  } catch (error) {
    request.log.error("Error in restore subscription endpoint:", error);
    throw error;
  }
}

export default async function RestoreSubscriptionPost(
  fastify: FastifyInstance
) {
  fastify.post<{
    Body: RestoreSubscriptionBody;
  }>("/subscriptions/restore", {
    schema: restoreSubscriptionFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
