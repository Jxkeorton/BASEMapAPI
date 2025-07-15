import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const deleteSubmissionFastifySchema = {
  description: 'Delete a pending submission',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

async function deleteSubmission(
  request: FastifyRequest<{ Params: { id: string } }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { id } = request.params;

    console.log('🗑️ User deleting submission:', id);

    // Check if submission exists and belongs to user and is pending
    const { data: existingSubmission, error: fetchError } = await supabaseAdmin
      .from('location_submission_requests')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', authenticatedRequest.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !existingSubmission) {
      return reply.code(404).send({
        success: false,
        error: 'Submission not found or cannot be deleted'
      });
    }

    // Delete the submission (images will be cascade deleted due to foreign key)
    const { error: deleteError } = await supabaseAdmin
      .from('location_submission_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.log('❌ Error deleting submission:', deleteError.message);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete submission',
        details: deleteError.message
      });
    }

    console.log('✅ Submission deleted successfully:', id);

    return reply.send({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    request.log.error('Error in deleteSubmission:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default async function SubmissionsDelete(fastify: FastifyInstance) {
  fastify.delete<{
    Params: { id: string };
  }>('/locations/submissions/:id', {
    schema: deleteSubmissionFastifySchema,
    preHandler: authenticateUser,
    handler: deleteSubmission
  });
}