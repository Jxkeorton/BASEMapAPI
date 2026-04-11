import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
  requireSuperuser,
} from "../../../../middleware/auth";
import { logger } from "../../../../services/logger";
import { supabaseAdmin } from "../../../../services/supabase";

const auditLogQuerySchema = Type.Object({
  action: Type.Optional(
    Type.Union([
      Type.Literal("created"),
      Type.Literal("updated"),
      Type.Literal("deleted"),
    ]),
  ),
  location_id: Type.Optional(Type.Integer()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

type AuditLogQuery = Static<typeof auditLogQuerySchema>;

const auditLogFastifySchema = {
  description: "Get location audit log (Superuser only)",
  tags: ["admin", "audit"],
  security: [{ bearerAuth: [] }],
  querystring: auditLogQuerySchema,
};

async function getAuditLog(
  request: FastifyRequest<{ Querystring: AuditLogQuery }>,
  reply: FastifyReply,
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { action, location_id, limit = 50, offset = 0 } = request.query;

    let query = supabaseAdmin
      .from("location_audit_log")
      .select(
        `
        *,
        performer:performed_by (id, email, name),
        undoer:undone_by (id, email, name)
      `,
      )
      .order("performed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }
    if (location_id) {
      query = query.eq("location_id", location_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    let countQuery = supabaseAdmin
      .from("location_audit_log")
      .select("*", { count: "exact", head: true });

    if (action) countQuery = countQuery.eq("action", action);
    if (location_id) countQuery = countQuery.eq("location_id", location_id);

    const { count } = await countQuery;

    logger.info("Audit log fetched", {
      adminUserId: authenticatedRequest.user.id,
      count: data?.length,
    });

    return reply.send({
      success: true,
      data: {
        entries: data,
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    request.log.error("Error fetching audit log:", error);
    throw error;
  }
}

export default async function AuditLogGet(fastify: FastifyInstance) {
  fastify.get("/admin/audit-log", {
    schema: auditLogFastifySchema,
    preHandler: [authenticateUser, requireSuperuser],
    handler: getAuditLog,
  });
}
