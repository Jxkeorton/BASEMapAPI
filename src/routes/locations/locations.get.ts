import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin, supabaseClient } from '../../services/supabase';

// Simple validation schema - just optional filters
const locationsQuerySchema = z.object({
  country: z.string().optional(),
  min_height: z.coerce.number().optional(),
  max_height: z.coerce.number().optional(),
  search: z.string().optional(),
});

type LocationsQuery = z.infer<typeof locationsQuerySchema>;

const locationsFastifySchema = {
  description: 'Get all BASE jumping locations',
  tags: ['locations'],
  querystring: {
    type: 'object',
    properties: {
      country: { type: 'string', description: 'Filter by country' },
      min_height: { type: 'number', description: 'Minimum height in feet' },
      max_height: { type: 'number', description: 'Maximum height in feet' },
      search: { type: 'string', description: 'Search in name, country, or notes' },
    },
  }
};

// Handler function
async function prod(request: FastifyRequest<{ Querystring: LocationsQuery }>, reply: FastifyReply) {
  try {

    // Validate query parameters
    const query = locationsQuerySchema.parse(request.query);

    console.log(query)

    // Build Supabase query
    let supabaseQuery = supabaseAdmin
      .from('locations')
      .select('*');

    console.log('supabase query', supabaseQuery)

    // Apply filters
    if (query.country) {
      supabaseQuery = supabaseQuery.ilike('country', `%${query.country}%`);
    }
    
    if (query.min_height) {
      supabaseQuery = supabaseQuery.gte('total_height_ft', query.min_height);
    }
    
    if (query.max_height) {
      supabaseQuery = supabaseQuery.lte('total_height_ft', query.max_height);
    }
    
    if (query.search) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query.search}%,country.ilike.%${query.search}%,notes.ilike.%${query.search}%`
      );
    }

    // Order by name
    supabaseQuery = supabaseQuery.order('name');

    const { data, error } = await supabaseQuery;

    console.log(data)

    if (error) {
      request.log.error('Error fetching locations:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch locations' 
      });
    }

    // Return simple response
    return reply.send({
      success: true,
      data: data || [],
    });

    
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
    }
    
    request.log.error('Error in locations endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function LocationsGet(fastify: FastifyInstance) {
  // Get all locations with optional filtering
  fastify.get<{
    Querystring: LocationsQuery;
  }>('/locations', {
    schema: locationsFastifySchema,
    handler: prod
  });
}