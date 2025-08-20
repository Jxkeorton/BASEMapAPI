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
    
    const body = unsaveLocationBodySchema.parse(request.body);

    // Get the location name for response message
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', body.location_id)
      .single();

    if (locationError || !location) {
      throw locationError || new Error('Location not found');
    }

    // Remove the saved location
    const { error } = await supabaseAdmin
      .from('user_saved_locations')
      .delete()
      .eq('user_id', authenticatedRequest.user.id)
      .eq('location_id', body.location_id)
      .select('id')
      .single();

    if (error) {
      request.log.error('Error unsaving location:', error);
      throw error;
    }

    return reply.send({
      success: true,
      message: `Location "${location.name}" removed from favorites`,
    });

  } catch (error) {
    request.log.error('Error in unsave location endpoint:', error);
    throw error;
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