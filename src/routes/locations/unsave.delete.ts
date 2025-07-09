import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const unsaveLocationBodySchema = z.object({
  location_id: z.number().int().positive('Location ID must be a positive integer'),
});

type UnsaveLocationBody = z.infer<typeof unsaveLocationBodySchema>;

const unsaveLocationFastifySchema = {
  description: 'Remove a location from user favorites',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['location_id'],
    properties: {
      location_id: { type: 'number', description: 'ID of the location to unsave' },
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
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  },
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('🗑️ Unsave location request for user:', authenticatedRequest.user.id);

    const body = unsaveLocationBodySchema.parse(request.body);

    console.log(supabaseAdmin);
    
    // Get the location name for response message
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', body.location_id)
      .single();

    if (locationError || !location) {
      console.log('❌ Location not found:', body.location_id);
      return reply.code(404).send({
        success: false,
        error: 'Location not found',
      });
    }

    // Remove the saved location
    const { data: deletedSave, error } = await supabaseAdmin
      .from('user_saved_locations')
      .delete()
      .eq('user_id', authenticatedRequest.user.id)
      .eq('location_id', body.location_id)
      .select('id')
      .single();

    console.log('📊 Supabase unsave location response:', { data: !!deletedSave, error });

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        console.log('⚠️ Location was not saved by user');
        return reply.code(404).send({
          success: false,
          error: 'Location is not in your favorites',
        });
      }

      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error unsaving location:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to remove location from favorites',
      });
    }

    console.log('✅ Location unsaved successfully:', location.name);

    return reply.send({
      success: true,
      message: `Location "${location.name}" removed from favorites`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in unsave location endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function UnsaveLocationDelete(fastify: FastifyInstance) {
  fastify.delete<{
    Body: UnsaveLocationBody;
  }>('/locations/unsave', {
    schema: unsaveLocationFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}