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
      throw checkError;
    }

    if (!existingEntry) {
      throw new Error('Logbook entry not found');
    }

    // Delete the entry
    const { error } = await supabaseAdmin
      .from('logbook_entries')
      .delete()
      .eq('id', params.id)
      .eq('user_id', authenticatedRequest.user.id);

    if (error) {
      request.log.error('Error deleting logbook entry:', error);
      throw error;
    }

    return reply.send({
      success: true,
      message: `Logbook entry "${existingEntry.location_name}" deleted successfully`,
    });

  } catch (error) {
    request.log.error('Error in delete logbook entry endpoint:', error);
    throw error;
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
