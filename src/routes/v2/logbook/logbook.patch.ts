import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest, authenticateUser } from "../../../middleware/auth";
import {
  UpdateLogbookBody,
  updateLogbookBodySchema,
} from "../../../schemas/logbook";
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
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const { id } = request.params;
    const updates = request.body;

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

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (updates.location_name !== undefined)
      updateData.location_name = updates.location_name;
    if (updates.exit_type !== undefined)
      updateData.exit_type = updates.exit_type;
    if (updates.delay_seconds !== undefined)
      updateData.delay_seconds = updates.delay_seconds;
    if (updates.jump_date !== undefined)
      updateData.jump_date = updates.jump_date;
    if (updates.details !== undefined) updateData.details = updates.details;

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields provided to update");
    }

    // Update the entry
    const { data: updatedEntry, error } = await supabaseAdmin
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

    return reply.send({
      success: true,
      message: "Logbook entry updated successfully",
      data: updatedEntry,
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
