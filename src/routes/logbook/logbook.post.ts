import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthenticatedRequest, authenticateUser } from "../../middleware/auth";
import { supabaseAdmin } from "../../services/supabase";

const createLogbookEntryBodySchema = z.object({
  location_name: z.string().min(1, "Location name is required").max(255),
  exit_type: z.enum(["Building", "Antenna", "Span", "Earth"]).optional(),
  delay_seconds: z.number().min(0).optional(),
  jump_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  details: z.string().max(1000).optional(),
});

type CreateLogbookEntryBody = z.infer<typeof createLogbookEntryBodySchema>;

const createLogbookEntryFastifySchema = {
  description: "Create a new logbook entry",
  tags: ["logbook"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["location_name"],
    properties: {
      location_name: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        description: "Name of the jump location",
      },
      exit_type: {
        type: "string",
        enum: ["Building", "Antenna", "Span", "Earth"],
        description: "Type of BASE jump",
      },
      delay_seconds: {
        type: "number",
        minimum: 0,
        description: "Freefall delay time in seconds",
      },
      jump_date: {
        type: "string",
        format: "date",
        description: "Date of the jump (YYYY-MM-DD)",
      },
      details: {
        type: "string",
        maxLength: 1000,
        description: "Additional notes and details",
      },
    },
  },
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
            created_at: { type: "string" },
          },
        },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Body: CreateLogbookEntryBody }>,
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const body = createLogbookEntryBodySchema.parse(request.body);

    // Create the logbook entry
    const { data: newEntry, error } = await supabaseAdmin
      .from("logbook_entries")
      .insert({
        user_id: authenticatedRequest.user.id,
        location_name: body.location_name,
        exit_type: body.exit_type || null,
        delay_seconds: body.delay_seconds || null,
        jump_date: body.jump_date || null,
        details: body.details || null,
      })
      .select("*")
      .single();

    if (error) {
      request.log.error("Error creating logbook entry:", error);
      throw error;
    }

    return reply.code(201).send({
      success: true,
      message: "Logbook entry created successfully",
      data: newEntry,
    });
  } catch (error) {
    request.log.error("Error in create logbook entry endpoint:", error);
    throw error;
  }
}

export default async function LogbookPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateLogbookEntryBody;
  }>("/logbook", {
    schema: createLogbookEntryFastifySchema,
    preHandler: authenticateUser,
    handler: prod,
  });
}
