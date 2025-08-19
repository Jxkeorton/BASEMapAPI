import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const updateLogbookEntryParamsSchema = z.object({
  id: z.string().uuid('Invalid logbook entry ID'),
});

const updateLogbookEntryBodySchema = z.object({
  location_name: z.string().min(1).max(255).optional(),
  exit_type: z.enum(['Building', 'Antenna', 'Span', 'Earth']).optional(),
  delay_seconds: z.number().min(0).optional(),
  jump_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  details: z.string().max(1000).optional(),
});

type UpdateLogbookEntryParams = z.infer<typeof updateLogbookEntryParamsSchema>;
type UpdateLogbookEntryBody = z.infer<typeof updateLogbookEntryBodySchema>;

const updateLogbookEntryFastifySchema = {
  description: 'Update a logbook entry',
  tags: ['logbook'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Logbook entry ID' },
    },
  },
  body: {
    type: 'object',
    properties: {
      location_name: { type: 'string', minLength: 1, maxLength: 255, description: 'Name of the jump location' },
      exit_type: { type: 'string', enum: ['Building', 'Antenna', 'Span', 'Earth'], description: 'Type of BASE jump' },
      delay_seconds: { type: 'number', minimum: 0, description: 'Freefall delay time in seconds' },
      jump_date: { type: 'string', format: 'date', description: 'Date of the jump (YYYY-MM-DD)' },
      details: { type: 'string', maxLength: 1000, description: 'Additional notes and details' },
    },
  },
};

async function prod(
  request: FastifyRequest<{ 
    Params: UpdateLogbookEntryParams; 
    Body: UpdateLogbookEntryBody;
  }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    const params = updateLogbookEntryParamsSchema.parse(request.params);
    const body = updateLogbookEntryBodySchema.parse(request.body);

    // Check if entry exists and belongs to user
    const { data: existingEntry, error: checkError } = await supabaseAdmin
      .from('logbook_entries')
      .select('id, location_name')
      .eq('id', params.id)
      .eq('user_id', authenticatedRequest.user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return reply.code(500).send({
        success: false,
        error: 'Failed to check logbook entry',
      });
    }

    if (!existingEntry) {
      return reply.code(404).send({
        success: false,
        error: 'Logbook entry not found',
      });
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (body.location_name !== undefined) updateData.location_name = body.location_name;
    if (body.exit_type !== undefined) updateData.exit_type = body.exit_type;
    if (body.delay_seconds !== undefined) updateData.delay_seconds = body.delay_seconds;
    if (body.jump_date !== undefined) updateData.jump_date = body.jump_date;
    if (body.details !== undefined) updateData.details = body.details;

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({
        success: false,
        error: 'No fields provided to update',
      });
    }

    // Update the entry
    const { data: updatedEntry, error } = await supabaseAdmin
      .from('logbook_entries')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', authenticatedRequest.user.id)
      .select('*')
      .single();

    if (error) {
      request.log.error('Error updating logbook entry:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update logbook entry',
      });
    }

    return reply.send({
      success: true,
      message: 'Logbook entry updated successfully',
      data: updatedEntry,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in update logbook entry endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function LogbookPatch(fastify: FastifyInstance) {
  fastify.patch<{
    Params: UpdateLogbookEntryParams;
    Body: UpdateLogbookEntryBody;
  }>('/logbook/:id', {
    schema: updateLogbookEntryFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}
