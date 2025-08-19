import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const deleteLogbookEntryParamsSchema = z.object({
  id: z.string().uuid('Invalid logbook entry ID'),
});

type DeleteLogbookEntryParams = z.infer<typeof deleteLogbookEntryParamsSchema>;

const deleteLogbookEntryFastifySchema = {
  description: 'Delete a logbook entry',
  tags: ['logbook'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Logbook entry ID' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

async function prod(
  request: FastifyRequest<{ Params: DeleteLogbookEntryParams }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    const params = deleteLogbookEntryParamsSchema.parse(request.params);

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

    // Delete the entry
    const { error } = await supabaseAdmin
      .from('logbook_entries')
      .delete()
      .eq('id', params.id)
      .eq('user_id', authenticatedRequest.user.id);

    if (error) {
      request.log.error('Error deleting logbook entry:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete logbook entry',
      });
    }

    return reply.send({
      success: true,
      message: `Logbook entry "${existingEntry.location_name}" deleted successfully`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    request.log.error('Error in delete logbook entry endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function LogbookDelete(fastify: FastifyInstance) {
  fastify.delete<{
    Params: DeleteLogbookEntryParams;
  }>('/logbook/:id', {
    schema: deleteLogbookEntryFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}
