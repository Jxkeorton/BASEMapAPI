import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";
import {
  UpdateLogbookBody,
  updateLogbookBodySchema,
} from "../../../schemas/logbook";
import { logger } from "../../../services/logger";
import { supabaseAdmin } from "../../../services/supabase";

type UpdateLogbookEntryParams = {
  id: string;
};

const updateLogbookEntryFastifySchema = {
  description: "Update a logbook entry",
  tags: ["logbook"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", description: "Logbook entry ID" },
    },
  },
  body: updateLogbookBodySchema,
};

async function prod(
  request: FastifyRequest<{
    Params: UpdateLogbookEntryParams;
    Body: UpdateLogbookBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const { id } = request.params;
    const updates = request.body;

    // Validate max 5 images if provided
    if (updates.images && updates.images.length > 5) {
      return reply.code(400).send({
        success: false,
        error: "Maximum 5 images allowed per logbook entry",
      });
    }

    logger.info("Logbook entry update requested", {
      userId: authenticatedRequest.user.id,
      entryId: id,
      fields: Object.keys(updates),
    });

    // Check if entry exists and belongs to user
    const { data: existingEntry, error: checkError } = await supabaseAdmin
      .from("logbook_entries")
      .select("id, location_name")
      .eq("id", id)
      .eq("user_id", authenticatedRequest.user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (!existingEntry) {
      throw new Error("Logbook entry not found");
    }

    // Separate images from other updates
    const { images, ...entryUpdates } = updates;

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (entryUpdates.location_name !== undefined)
      updateData.location_name = entryUpdates.location_name;
    if (entryUpdates.exit_type !== undefined)
      updateData.exit_type = entryUpdates.exit_type;
    if (entryUpdates.delay_seconds !== undefined)
      updateData.delay_seconds = entryUpdates.delay_seconds;
    if (entryUpdates.jump_date !== undefined)
      updateData.jump_date = entryUpdates.jump_date;
    if (entryUpdates.details !== undefined)
      updateData.details = entryUpdates.details;

    // Handle images update if provided
    if (images !== undefined) {
      // Delete existing images
      await supabaseAdmin
        .from("logbook_images")
        .delete()
        .eq("logbook_entry_id", id);

      // Insert new images if not null/empty
      if (images && images.length > 0) {
        const imageInserts = images.map((url, index) => ({
          logbook_entry_id: id,
          image_url: url,
          display_order: index,
        }));

        const { error: imageError } = await supabaseAdmin
          .from("logbook_images")
          .insert(imageInserts);

        if (imageError) {
          request.log.error("Error updating logbook images:", imageError);
        }
      }
    }

    // Update the entry if there are fields to update
    let updatedEntry;
    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabaseAdmin
        .from("logbook_entries")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", authenticatedRequest.user.id)
        .select("*")
        .single();

      if (error) {
        request.log.error("Error updating logbook entry:", error);
        throw error;
      }
      updatedEntry = data;
    } else {
      // Fetch current entry if only images were updated
      const { data, error } = await supabaseAdmin
        .from("logbook_entries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }
      updatedEntry = data;
    }

    // Fetch updated images
    const { data: entryImages } = await supabaseAdmin
      .from("logbook_images")
      .select("image_url, display_order")
      .eq("logbook_entry_id", id)
      .order("display_order", { ascending: true, nullsFirst: false });

    const imageUrls = (entryImages || []).map((img) => img.image_url);

    logger.info("Logbook entry updated", {
      userId: authenticatedRequest.user.id,
      entryId: id,
    });

    return reply.send({
      success: true,
      message: "Logbook entry updated successfully",
      data: {
        ...updatedEntry,
        images: imageUrls,
      },
    });
  } catch (error) {
    request.log.error("Error in update logbook entry endpoint:", error);
    throw error;
  }
}

export default async function LogbookPatch(fastify: FastifyInstance) {
  fastify.patch("/logbook/:id", {
    schema: updateLogbookEntryFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
