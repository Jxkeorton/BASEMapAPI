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

export type RevenueCatWebhookBody = Static<typeof revenueCatWebhookBodySchema>;
