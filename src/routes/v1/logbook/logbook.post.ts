import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import {
  CreateLogbookBody,
  createLogbookBodySchema,
} from "../../../schemas/logbook";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

const createLogbookEntryFastifySchema = {
  description: "Create a new logbook entry",
  tags: ["logbook"],
  security: [{ bearerAuth: [] }],
  body: createLogbookBodySchema,
  response: {
    201: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            location_name: { type: "string" },
            exit_type: { type: "string" },
            delay_seconds: { type: "number" },
            jump_date: { type: "string" },
            details: { type: "string" },
            images: { type: "array", items: { type: "string" } },
            created_at: { type: "string" },
          },
        },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Body: CreateLogbookBody }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const {
      location_name,
      exit_type,
      delay_seconds,
      jump_date,
      details,
      images,
    } = request.body;

    // Validate max 5 images
    if (images && images.length > 5) {
      return reply.code(400).send({
        success: false,
        error: "Maximum 5 images allowed per logbook entry",
      });
    }

    logger.info("Logbook entry creation", {
      userId: authenticatedRequest.user.id,
      locationName: location_name,
      exitType: exit_type,
    });

    // Create the logbook entry
    const { data: newEntry, error } = await supabaseAdmin
      .from("logbook_entries")
      .insert({
        user_id: authenticatedRequest.user.id,
        location_name,
        exit_type: exit_type || null,
        delay_seconds: delay_seconds || null,
        jump_date: jump_date || null,
        details: details || null,
      })
      .select("*")
      .single();

    if (error) {
      request.log.error("Error creating logbook entry:", error);
      throw error;
    }

    // Insert images if provided
    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      const imageInserts = images.map((url, index) => ({
        logbook_entry_id: newEntry.id,
        image_url: url,
        display_order: index,
      }));

      const { error: imageError } = await supabaseAdmin
        .from("logbook_images")
        .insert(imageInserts);

      if (imageError) {
        request.log.error("Error inserting logbook images:", imageError);
        // Don't throw - entry was created, just log the error
      } else {
        imageUrls = images;
      }
    }

    logger.info("Logbook entry created", {
      userId: authenticatedRequest.user.id,
      entryId: newEntry.id,
      locationName: location_name,
    });

    return reply.code(201).send({
      success: true,
      message: "Logbook entry created successfully",
      data: {
        ...newEntry,
        images: imageUrls,
      },
    });
  } catch (error) {
    request.log.error("Error in create logbook entry endpoint:", error);
    throw error;
  }
}

export default async function LogbookPost(fastify: FastifyInstance) {
  fastify.post("/logbook", {
    schema: createLogbookEntryFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
