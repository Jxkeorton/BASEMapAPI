import { Static, Type } from "@sinclair/typebox";

// RevenueCat webhook schema
export const revenueCatWebhookBodySchema = Type.Object({
  api_version: Type.String(),
  event: Type.Object({
    type: Type.String(),
    app_user_id: Type.String(),
    product_id: Type.Optional(Type.String()),
    period_type: Type.Optional(Type.String()),
    purchased_at_ms: Type.Optional(Type.Number()),
    expiration_at_ms: Type.Optional(Type.Number()),
    is_trial_period: Type.Optional(Type.Boolean()),
    price: Type.Optional(Type.Number()),
    currency: Type.Optional(Type.String()),
  }),
});

// Restore subscription schema
export const restoreSubscriptionBodySchema = Type.Object({
  revenuecat_customer_id: Type.String({ minLength: 1 }),
  subscription_status: Type.Union([
    Type.Literal("free"),
    Type.Literal("trial"),
    Type.Literal("active"),
    Type.Literal("expired"),
  ]),
  subscription_expires_at: Type.Optional(Type.String({ format: "date-time" })),
  subscription_product_id: Type.Optional(Type.String()),
});

export type RevenueCatWebhookBody = Static<typeof revenueCatWebhookBodySchema>;
export type RestoreSubscriptionBody = Static<
  typeof restoreSubscriptionBodySchema
>;
