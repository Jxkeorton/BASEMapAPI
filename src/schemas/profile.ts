// Response data schema for GET /api/v1/profile

export const ProfileResponseData = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string", nullable: true },
    name: { type: "string", nullable: true },
    username: { type: "string", nullable: true },
    jump_number: { type: "integer" },
    role: { type: "string", enum: ["USER", "ADMIN", "SUPERUSER"] },
    subscription_status: {
      type: "string",
      enum: ["free", "trial", "active", "expired"],
    },
    subscription_expires_at: {
      type: "string",
      format: "date-time",
      nullable: true,
    },
    subscription_updated_at: { type: "string", format: "date-time" },
    revenuecat_customer_id: { type: "string", nullable: true },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "jump_number",
    "role",
    "subscription_status",
    "created_at",
    "updated_at",
  ],
};
