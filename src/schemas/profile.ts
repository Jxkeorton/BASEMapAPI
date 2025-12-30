import { Static, Type } from "@sinclair/typebox";

// TypeBox schemas
export const updateProfileBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  username: Type.Optional(Type.String({ minLength: 3, maxLength: 30 })),
  jump_number: Type.Optional(Type.Number({ minimum: 0, maximum: 10000 })),
});

export const profileResponseDataSchema = Type.Object({
  id: Type.String(),
  email: Type.Union([Type.String(), Type.Null()]),
  name: Type.Union([Type.String(), Type.Null()]),
  username: Type.Union([Type.String(), Type.Null()]),
  jump_number: Type.Integer(),
  role: Type.Union([
    Type.Literal("USER"),
    Type.Literal("ADMIN"),
    Type.Literal("SUPERUSER"),
  ]),
  subscription_status: Type.Union([
    Type.Literal("free"),
    Type.Literal("trial"),
    Type.Literal("active"),
    Type.Literal("expired"),
  ]),
  subscription_expires_at: Type.Union([
    Type.String({ format: "date-time" }),
    Type.Null(),
  ]),
  subscription_updated_at: Type.String({ format: "date-time" }),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
});

export type UpdateProfileBody = Static<typeof updateProfileBodySchema>;
export type ProfileResponseData = Static<typeof profileResponseDataSchema>;

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
