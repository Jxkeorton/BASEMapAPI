import { Static, Type } from "@sinclair/typebox";

// TypeBox schemas
export const createLogbookBodySchema = Type.Object({
  location_name: Type.String({ minLength: 1 }),
  exit_type: Type.Optional(
    Type.Union([
      Type.Literal("Building"),
      Type.Literal("Antenna"),
      Type.Literal("Span"),
      Type.Literal("Earth"),
    ])
  ),
  delay_seconds: Type.Optional(Type.Integer({ minimum: 0 })),
  jump_date: Type.Optional(Type.String({ format: "date" })),
  details: Type.Optional(Type.String()),
});

export const updateLogbookBodySchema = Type.Object({
  location_name: Type.Optional(Type.String({ minLength: 1 })),
  exit_type: Type.Optional(
    Type.Union([
      Type.Literal("Building"),
      Type.Literal("Antenna"),
      Type.Literal("Span"),
      Type.Literal("Earth"),
      Type.Null(),
    ])
  ),
  delay_seconds: Type.Optional(
    Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])
  ),
  jump_date: Type.Optional(
    Type.Union([Type.String({ format: "date" }), Type.Null()])
  ),
  details: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type CreateLogbookBody = Static<typeof createLogbookBodySchema>;
export type UpdateLogbookBody = Static<typeof updateLogbookBodySchema>;

// Response data schema for GET /api/v1/logbook

export const LogbookResponseData = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          user_id: { type: "string" },
          location_name: { type: "string" },
          exit_type: {
            type: "string",
            enum: ["Building", "Antenna", "Span", "Earth"],
            nullable: true,
          },
          delay_seconds: { type: "integer", nullable: true },
          jump_date: { type: "string", format: "date", nullable: true },
          details: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "user_id",
          "location_name",
          "created_at",
          "updated_at",
        ],
      },
    },
    total_count: { type: "integer" },
    has_more: { type: "boolean" },
  },
  required: ["entries", "total_count", "has_more"],
};
