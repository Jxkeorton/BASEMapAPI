import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const saveLocationBodySchema = z.object({
  location_id: z.number().int().positive('Location ID must be a positive integer'),
});

type SaveLocationBody = z.infer<typeof saveLocationBodySchema>;

const saveLocationFastifySchema = {
  description: 'Save a location to user favorites',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['location_id'],
    properties: {
      location_id: { type: 'number', description: 'ID of the location to save' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            save_id: { type: 'string' },
            location_id: { type: 'number' },
            saved_at: { type: 'string' },
          },
        },
      },
    }
  },
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    const body = saveLocationBodySchema.parse(request.body);

    // First, check if the location exists
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', body.location_id)
      .single();

    if (locationError || !location) {
      throw new Error('Location not found');
    }

    // Check if location is already saved by this user
    const { data: existingSave, error: checkError } = await supabaseAdmin
      .from('user_saved_locations')
      .select('id')
      .eq('user_id', authenticatedRequest.user.id)
      .eq('location_id', body.location_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found (good)
      throw checkError;
    }

    if (existingSave) {
      throw new Error('Location is already saved to your favorites');
    }

    // Save the location
    const { data: savedLocation, error } = await supabaseAdmin
      .from('user_saved_locations')
      .insert({
        user_id: authenticatedRequest.user.id,
        location_id: body.location_id,
      })
      .select('id, location_id, created_at')
      .single();

    if (error) {
      request.log.error('Error saving location:', error);
      throw error;
    }

    return reply.send({
      success: true,
      message: `Location "${location.name}" saved to favorites`,
      data: {
        save_id: savedLocation.id,
        location_id: savedLocation.location_id,
        saved_at: savedLocation.created_at,
      },
    });

  } catch (error) {
    request.log.error('Error in save location endpoint:', error);
    throw error;
  }
}

export default async function SaveLocationPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: SaveLocationBody;
  }>('/locations/save', {
    schema: saveLocationFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}