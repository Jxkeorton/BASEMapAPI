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
    },
    400: {
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
    
    const body = saveLocationBodySchema.parse(request.body);

    // First, check if the location exists
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', body.location_id)
      .single();

    if (locationError || !location) {
      return reply.code(404).send({
        success: false,
        error: 'Location not found',
      });
    }

    // Check if location is already saved by this user
    const { data: existingSave, error: checkError } = await supabaseAdmin
      .from('user_saved_locations')
      .select('id')
      .eq('user_id', authenticatedRequest.user.id)
      .eq('location_id', body.location_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found (good)
      return reply.code(500).send({
        success: false,
        error: 'Failed to check if location is already saved',
      });
    }

    if (existingSave) {
      return reply.code(400).send({
        success: false,
        error: 'Location is already saved to your favorites',
      });
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
      return reply.code(500).send({
        success: false,
        error: 'Failed to save location',
      });
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
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in save location endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
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