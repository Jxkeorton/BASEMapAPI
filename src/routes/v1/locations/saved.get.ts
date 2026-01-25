import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { SavedLocationsResponseData } from "../../../schemas/locations";
import { getLocationImagesMap } from "../../../services/locationImages";
import { supabaseAdmin } from "../../../services/supabase";

type SavedLocationsQuery = {
  limit?: number;
  offset?: number;
};

const savedLocationsFastifySchema = {
  description: "Get user saved locations with full location details",
  tags: ["locations"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        minimum: 1,
        maximum: 100,
        default: 50,
        description: "Number of locations to return",
      },
      offset: {
        type: "number",
        minimum: 0,
        default: 0,
        description: "Number of locations to skip",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: SavedLocationsResponseData,
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Querystring: SavedLocationsQuery }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const query = request.query;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    // Get saved locations with full location details
    const { data: savedLocations, error } = await supabaseAdmin
      .from("user_saved_locations")
      .select(
        `
        id,
        created_at,
        locations:location_id (
          id,
          name,
          country,
          latitude,
          longitude,
          rock_drop_ft,
          total_height_ft,
          cliff_aspect,
          anchor_info,
          access_info,
          notes,
          opened_by_name,
          opened_date,
          video_link,
          created_at,
          updated_at
        )
      `,
      )
      .eq("user_id", authenticatedRequest.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      request.log.error("Error fetching saved locations:", error);
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("user_saved_locations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authenticatedRequest.user.id);

    if (countError) {
      request.log.warn("⚠️ Error getting total count:", countError.message);
    }

    // Get location IDs and fetch images
    const locationIds = (savedLocations || [])
      .map((save) => (save.locations as any)?.id)
      .filter((id): id is number => id !== undefined);
    const imagesMap = await getLocationImagesMap(locationIds);

    // Transform the data to flatten the structure and add images
    const transformedLocations = (savedLocations || []).map((save) => {
      const location = save.locations as any;
      return {
        save_id: save.id,
        saved_at: save.created_at,
        location: location
          ? {
              ...location,
              images: imagesMap[location.id] || [],
            }
          : null,
      };
    });

    const hasMore = (totalCount || 0) > offset + limit;

    // Return simple response
    return reply.send({
      success: true,
      data: {
        saved_locations: transformedLocations,
        total_count: totalCount || 0,
        has_more: hasMore,
      },
    });
  } catch (error) {
    request.log.error("Error in saved locations endpoint:", error);
    throw error;
  }
}

export default async function SavedLocationsGet(fastify: FastifyInstance) {
  fastify.get("/locations/saved", {
    schema: savedLocationsFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
