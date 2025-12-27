import { Static, Type } from "@sinclair/typebox";

// TypeBox schemas
export const saveLocationBodySchema = Type.Object({
  location_id: Type.Integer({ minimum: 1 }),
});

export const unsaveLocationBodySchema = Type.Object({
  location_id: Type.Integer({ minimum: 1 }),
});

// Admin schemas
export const createLocationBodySchema = Type.Object({
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
  is_hidden: Type.Optional(Type.Boolean()),
});

export const updateLocationBodySchema = Type.Object({
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
  is_hidden: Type.Optional(Type.Boolean()),
});

export const locationParamsSchema = Type.Object({
  locationId: Type.Integer({ minimum: 1 }),
});

export type SaveLocationBody = Static<typeof saveLocationBodySchema>;
export type UnsaveLocationBody = Static<typeof unsaveLocationBodySchema>;
export type CreateLocationBody = Static<typeof createLocationBodySchema>;
export type UpdateLocationBody = Static<typeof updateLocationBodySchema>;
export type LocationParams = Static<typeof locationParamsSchema>;

// Response data schema for GET /api/v1/locations

export const LocationsResponseData = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "integer" },
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
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
      created_by: { type: "string", nullable: true },
      updated_by: { type: "string", nullable: true },
    },
    required: [
      "id",
      "name",
      "latitude",
      "longitude",
      "created_at",
      "updated_at",
    ],
  },
};

// Response data schema for GET /api/v1/locations/saved

export const SavedLocationsResponseData = {
  type: "object",
  properties: {
    saved_locations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          save_id: { type: "string" },
          saved_at: { type: "string", format: "date-time" },
          location: {
            type: "object",
            properties: {
              id: { type: "integer" },
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
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "name",
              "latitude",
              "longitude",
              "created_at",
              "updated_at",
            ],
          },
        },
        required: ["save_id", "saved_at", "location"],
      },
    },
    total_count: { type: "integer" },
    has_more: { type: "boolean" },
  },
  required: ["saved_locations", "total_count", "has_more"],
};
