import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import { LogbookResponseData } from "../../../schemas/logbook";
import { supabaseAdmin } from "../../../services/supabase";

type LogbookQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  exit_type?: "Building" | "Antenna" | "Span" | "Earth";
  date_from?: string;
  date_to?: string;
  order?: "asc" | "desc";
};

const logbookFastifySchema = {
  description: "Get user logbook entries",
  tags: ["logbook"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        minimum: 1,
        maximum: 100,
        default: 50,
        description: "Number of entries to return",
      },
      offset: {
        type: "number",
        minimum: 0,
        default: 0,
        description: "Number of entries to skip",
      },
      search: {
        type: "string",
        description: "Search in location name or details",
      },
      exit_type: {
        type: "string",
        enum: ["Building", "Antenna", "Span", "Earth"],
        description: "Filter by exit type",
      },
      date_from: {
        type: "string",
        format: "date",
        description: "Filter entries from this date (YYYY-MM-DD)",
      },
      date_to: {
        type: "string",
        format: "date",
        description: "Filter entries to this date (YYYY-MM-DD)",
      },
      order: {
        type: "string",
        enum: ["asc", "desc"],
        default: "desc",
        description: "Sort order by jump date",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: LogbookResponseData,
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Querystring: LogbookQuery }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const query = request.query;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const order = query.order ?? "desc";

    // Build Supabase query
    let supabaseQuery = supabaseAdmin
      .from("logbook_entries")
      .select("*")
      .eq("user_id", authenticatedRequest.user.id);

    // Apply filters
    if (query.search) {
      supabaseQuery = supabaseQuery.or(
        `location_name.ilike.%${query.search}%,details.ilike.%${query.search}%`,
      );
    }

    if (query.exit_type) {
      supabaseQuery = supabaseQuery.eq("exit_type", query.exit_type);
    }

    if (query.date_from) {
      supabaseQuery = supabaseQuery.gte("jump_date", query.date_from);
    }

    if (query.date_to) {
      supabaseQuery = supabaseQuery.lte("jump_date", query.date_to);
    }

    // Order by jump date, then by created_at as secondary sort
    supabaseQuery = supabaseQuery
      .order("jump_date", { ascending: order === "asc" })
      .order("created_at", { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data: entries, error } = await supabaseQuery;

    if (error) {
      request.log.error("Error fetching logbook entries:", error);
      throw error;
    }

    // Fetch images for all entries
    const entryIds = (entries || []).map((e) => e.id);
    let imagesMap: Record<string, string[]> = {};

    if (entryIds.length > 0) {
      const { data: images, error: imagesError } = await supabaseAdmin
        .from("logbook_images")
        .select("logbook_entry_id, image_url, display_order")
        .in("logbook_entry_id", entryIds)
        .order("display_order", { ascending: true, nullsFirst: false });

      if (imagesError) {
        request.log.error("Error fetching logbook images:", imagesError);
      } else if (images) {
        // Group images by entry ID
        for (const img of images) {
          if (!imagesMap[img.logbook_entry_id]) {
            imagesMap[img.logbook_entry_id] = [];
          }
          imagesMap[img.logbook_entry_id].push(img.image_url);
        }
      }
    }

    // Add images array to each entry
    const entriesWithImages = (entries || []).map((entry) => ({
      ...entry,
      images: imagesMap[entry.id] || [],
    }));

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("logbook_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authenticatedRequest.user.id);

    if (countError) {
      request.log.error("⚠️ Error getting total count:", countError.message);
    }

    const hasMore = (totalCount || 0) > offset + limit;

    return reply.send({
      success: true,
      data: {
        entries: entriesWithImages,
        total_count: totalCount || 0,
        has_more: hasMore,
      },
    });
  } catch (error) {
    request.log.error("Error in logbook entries endpoint:", error);
    throw error;
  }
}

export default async function LogbookGet(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: LogbookQuery;
  }>("/logbook", {
    schema: logbookFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
