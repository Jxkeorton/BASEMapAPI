import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const savedLocationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

type SavedLocationsQuery = z.infer<typeof savedLocationsQuerySchema>;

const savedLocationsFastifySchema = {
  description: 'Get user saved locations with full location details',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Number of locations to return' },
      offset: { type: 'number', minimum: 0, default: 0, description: 'Number of locations to skip' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            saved_locations: { type: 'array' },
            total_count: { type: 'number' },
            has_more: { type: 'boolean' },
          },
        },
      },
    },
  },
};

async function prod(request: FastifyRequest<{ Querystring: SavedLocationsQuery }>, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('📋 Get saved locations request for user:', authenticatedRequest.user.id);

    const query = savedLocationsQuerySchema.parse(request.query);

    console.log(supabaseAdmin);
    
    // Get saved locations with full location details
    const { data: savedLocations, error } = await supabaseAdmin
      .from('user_saved_locations')
      .select(`
        id,
        created_at,
        locations:location_id (
          id,
          name,
          country,
          latitude,
          longitude,
          rock_drop_ft,
          total_height_ft,
          cliff_aspect,
          anchor_info,
          access_info,
          notes,
          opened_by_name,
          opened_date,
          video_link,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', authenticatedRequest.user.id)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    console.log('📊 Supabase saved locations response:', { 
      data: savedLocations?.length || 0, 
      error 
    });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error fetching saved locations:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch saved locations',
      });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('user_saved_locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authenticatedRequest.user.id);

    if (countError) {
      console.log('⚠️ Error getting total count:', countError.message);
    }

    // Transform the data to flatten the structure
    const transformedLocations = (savedLocations || []).map(save => ({
      save_id: save.id,
      saved_at: save.created_at,
      location: save.locations,
    }));

    const hasMore = (totalCount || 0) > query.offset + query.limit;

    console.log('✅ Returned', transformedLocations.length, 'saved locations');

    // Return simple response
    return reply.send({
      success: true,
      data: {
        saved_locations: transformedLocations,
        total_count: totalCount || 0,
        has_more: hasMore,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    request.log.error('Error in saved locations endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function SavedLocationsGet(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: SavedLocationsQuery;
  }>('/locations/saved', {
    schema: savedLocationsFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}