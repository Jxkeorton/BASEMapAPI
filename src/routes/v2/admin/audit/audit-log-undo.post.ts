import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireSuperuser,
} from "../../../../middleware/auth";
import { logger } from "../../../../services/logger";
import { supabaseAdmin } from "../../../../services/supabase";
import { Database } from "../../../../types/supabase";

const undoParamsSchema = Type.Object({
  entryId: Type.String({ format: "uuid" }),
});

type UndoParams = Static<typeof undoParamsSchema>;

const undoFastifySchema = {
  description: "Undo a location creation or deletion (Superuser only)",
  tags: ["admin", "audit"],
  security: [{ bearerAuth: [] }],
  params: undoParamsSchema,
};

async function undoAuditEntry(
  request: FastifyRequest<{ Params: UndoParams }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { entryId } = request.params;

    // Fetch the audit entry
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from("location_audit_log")
      .select("*")
      .eq("id", entryId)
      .single();

    if (fetchError || !entry) {
      return reply.code(404).send({
        success: false,
        error: "Audit log entry not found",
      });
    }

    if (entry.undone) {
      return reply.code(400).send({
        success: false,
        error: "This action has already been undone",
      });
    }

    const snapshot = entry.location_snapshot as Record<string, unknown>;
    let result: Record<string, unknown> | null = null;

    if (entry.action === "deleted") {
      // Undo delete = re-insert the location from snapshot
      const { id, created_at, updated_at, ...locationData } = snapshot;

      const { data: restored, error: insertError } = await supabaseAdmin
        .from("locations")
        .insert([
          locationData as Database["public"]["Tables"]["locations"]["Insert"],
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      result = restored;

      // Log the restore as a new "created" audit entry
      await supabaseAdmin.from("location_audit_log").insert([
        {
          location_id: restored.id,
          action: "created",
          performed_by: authenticatedRequest.user.id,
          location_snapshot: restored,
          source: "admin",
          notes: `Restored from undo of audit entry ${entryId}`,
        },
      ]);
    } else if (entry.action === "created") {
      // Undo create = delete the location
      const locationId = snapshot.id as number;

      // Verify the location still exists
      const { data: existing, error: existError } = await supabaseAdmin
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .single();

      if (existError || !existing) {
        return reply.code(400).send({
          success: false,
          error: "Location no longer exists, cannot undo creation",
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from("locations")
        .delete()
        .eq("id", locationId);

      if (deleteError) {
        throw deleteError;
      }

      result = existing;

      // Log the deletion as a new "deleted" audit entry
      await supabaseAdmin.from("location_audit_log").insert([
        {
          location_id: locationId,
          action: "deleted",
          performed_by: authenticatedRequest.user.id,
          location_snapshot: existing,
          source: "admin",
          notes: `Deleted via undo of audit entry ${entryId}`,
        },
      ]);
    }

    // Mark the original entry as undone
    await supabaseAdmin
      .from("location_audit_log")
      .update({
        undone: true,
        undone_by: authenticatedRequest.user.id,
        undone_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    logger.info("Audit entry undone", {
      adminUserId: authenticatedRequest.user.id,
      entryId,
      action: entry.action,
      locationId: entry.location_id,
    });

    return reply.send({
      success: true,
      message: `Successfully undone ${entry.action} action`,
      data: { result },
    });
  } catch (error) {
    request.log.error("Error undoing audit entry:", error);
    throw error;
  }
}

export default async function AuditLogUndoPost(fastify: FastifyInstance) {
  fastify.post("/admin/audit-log/:entryId/undo", {
    schema: undoFastifySchema,
    preHandler: [authenticateUser, requireSuperuser],
    handler: undoAuditEntry,
  });
}
