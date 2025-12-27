import { Static, Type } from "@sinclair/typebox";

// TypeBox schemas
export const createSubmissionBodySchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  country: Type.Optional(Type.String()),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  rock_drop_ft: Type.Optional(Type.Integer({ minimum: 1 })),
  total_height_ft: Type.Optional(Type.Integer({ minimum: 1 })),
  cliff_aspect: Type.Optional(Type.String()),
  anchor_info: Type.Optional(Type.String()),
  access_info: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  opened_by_name: Type.Optional(Type.String()),
  opened_date: Type.Optional(Type.String()),
  video_link: Type.Optional(Type.String({ format: "uri" })),
  submission_type: Type.Union([Type.Literal("new"), Type.Literal("update")]),
  existing_location_id: Type.Optional(Type.Integer({ minimum: 1 })),
  image_urls: Type.Optional(Type.Array(Type.String({ format: "uri" }))),
});

// User update schema (can update most fields except status/admin_notes)
export const updateSubmissionUserBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  country: Type.Optional(Type.String()),
  latitude: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
  longitude: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
  rock_drop_ft: Type.Optional(Type.Integer({ minimum: 1 })),
  total_height_ft: Type.Optional(Type.Integer({ minimum: 1 })),
  cliff_aspect: Type.Optional(Type.String()),
  anchor_info: Type.Optional(Type.String()),
  access_info: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  opened_by_name: Type.Optional(Type.String()),
  opened_date: Type.Optional(Type.String()),
  video_link: Type.Optional(Type.String({ format: "uri" })),
  image_urls: Type.Optional(Type.Array(Type.String({ format: "uri" }))),
});

// Admin update schema (can only update status and admin_notes)
export const updateSubmissionBodySchema = Type.Object({
  status: Type.Optional(
    Type.Union([
      Type.Literal("pending"),
      Type.Literal("approved"),
      Type.Literal("rejected"),
    ])
  ),
  admin_notes: Type.Optional(Type.String()),
});

export const getSubmissionsQuerySchema = Type.Object({
  status: Type.Optional(
    Type.Union([
      Type.Literal("pending"),
      Type.Literal("approved"),
      Type.Literal("rejected"),
    ])
  ),
  submission_type: Type.Optional(
    Type.Union([Type.Literal("new"), Type.Literal("update")])
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

// Admin query schema with additional filters
export const adminSubmissionsQuerySchema = Type.Object({
  status: Type.Optional(
    Type.Union([
      Type.Literal("pending"),
      Type.Literal("approved"),
      Type.Literal("rejected"),
    ])
  ),
  submission_type: Type.Optional(
    Type.Union([Type.Literal("new"), Type.Literal("update")])
  ),
  user_id: Type.Optional(Type.String({ format: "uuid" })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  sort_by: Type.Optional(
    Type.Union([
      Type.Literal("created_at"),
      Type.Literal("name"),
      Type.Literal("status"),
    ])
  ),
  sort_order: Type.Optional(
    Type.Union([Type.Literal("asc"), Type.Literal("desc")])
  ),
});

// Admin review schema
export const submissionParamsSchema = Type.Object({
  submissionId: Type.String({ format: "uuid" }),
});

export const reviewSubmissionBodySchema = Type.Object({
  status: Type.Union([Type.Literal("approved"), Type.Literal("rejected")]),
  admin_notes: Type.Optional(Type.String()),
  override_data: Type.Optional(
    Type.Object({
      name: Type.Optional(Type.String({ minLength: 1 })),
      country: Type.Optional(Type.String()),
      latitude: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
      longitude: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
      rock_drop_ft: Type.Optional(Type.Integer({ minimum: 1 })),
      total_height_ft: Type.Optional(Type.Integer({ minimum: 1 })),
      cliff_aspect: Type.Optional(Type.String()),
      anchor_info: Type.Optional(Type.String()),
      access_info: Type.Optional(Type.String()),
      notes: Type.Optional(Type.String()),
      opened_by_name: Type.Optional(Type.String()),
      opened_date: Type.Optional(Type.String()),
      video_link: Type.Optional(Type.String({ format: "uri" })),
    })
  ),
});

export type CreateSubmissionBody = Static<typeof createSubmissionBodySchema>;
export type UpdateSubmissionUserBody = Static<
  typeof updateSubmissionUserBodySchema
>;
export type UpdateSubmissionBody = Static<typeof updateSubmissionBodySchema>;
export type GetSubmissionsQuery = Static<typeof getSubmissionsQuerySchema>;
export type AdminSubmissionsQuery = Static<typeof adminSubmissionsQuerySchema>;
export type SubmissionParams = Static<typeof submissionParamsSchema>;
export type ReviewSubmissionBody = Static<typeof reviewSubmissionBodySchema>;

// Response data schema for GET /api/v1/locations/submissions

export const SubmissionsResponseData = {
  type: "object",
  properties: {
    submissions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          user_id: { type: "string" },
          name: { type: "string" },
          country: { type: "string", nullable: true },
          latitude: { type: "number" },
          longitude: { type: "number" },
          rock_drop_ft: { type: "integer", nullable: true },
          total_height_ft: { type: "integer", nullable: true },
          cliff_aspect: { type: "string", nullable: true },
          anchor_info: { type: "string", nullable: true },
          access_info: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          opened_by_name: { type: "string", nullable: true },
          opened_date: { type: "string", nullable: true },
          video_link: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
          submission_type: { type: "string", enum: ["new", "update"] },
          existing_location_id: { type: "integer", nullable: true },
          admin_notes: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          reviewed_at: { type: "string", format: "date-time", nullable: true },
          reviewed_by: { type: "string", nullable: true },
          // Transformed fields added by your handler
          images: {
            type: "array",
            items: { type: "string" },
            description: "Array of image URLs sorted by image_order",
          },
          existing_location_name: {
            type: "string",
            nullable: true,
            description: "Name of existing location for updates",
          },
        },
        required: [
          "id",
          "user_id",
          "name",
          "latitude",
          "longitude",
          "status",
          "submission_type",
          "created_at",
          "updated_at",
          "images",
          "existing_location_name",
        ],
      },
    },
    total_count: { type: "integer" },
    has_more: { type: "boolean" },
  },
  required: ["submissions", "total_count", "has_more"],
};
