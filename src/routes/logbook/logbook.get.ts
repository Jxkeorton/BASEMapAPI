
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const logbookQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  search: z.string().optional(),
  exit_type: z.enum(['Building', 'Antenna', 'Span', 'Earth']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

type LogbookQuery = z.infer<typeof logbookQuerySchema>;

const logbookFastifySchema = {
  description: 'Get user logbook entries',
  tags: ['logbook'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Number of entries to return' },
      offset: { type: 'number', minimum: 0, default: 0, description: 'Number of entries to skip' },
      search: { type: 'string', description: 'Search in location name or details' },
      exit_type: { type: 'string', enum: ['Building', 'Antenna', 'Span', 'Earth'], description: 'Filter by exit type' },
      date_from: { type: 'string', format: 'date', description: 'Filter entries from this date (YYYY-MM-DD)' },
      date_to: { type: 'string', format: 'date', description: 'Filter entries to this date (YYYY-MM-DD)' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort order by jump date' },
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
            entries: { type: 'array' },
            total_count: { type: 'number' },
            has_more: { type: 'boolean' },
          },
        },
      },
    },
  },
};

async function prod(request: FastifyRequest<{ Querystring: LogbookQuery }>, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('📋 Get logbook entries request for user:', authenticatedRequest.user.id);

    const query = logbookQuerySchema.parse(request.query);

    // Build Supabase query
    let supabaseQuery = supabaseAdmin
      .from('logbook_entries')
      .select('*')
      .eq('user_id', authenticatedRequest.user.id);

    // Apply filters
    if (query.search) {
      supabaseQuery = supabaseQuery.or(
        `location_name.ilike.%${query.search}%,details.ilike.%${query.search}%`
      );
    }
    
    if (query.exit_type) {
      supabaseQuery = supabaseQuery.eq('exit_type', query.exit_type);
    }
    
    if (query.date_from) {
      supabaseQuery = supabaseQuery.gte('jump_date', query.date_from);
    }
    
    if (query.date_to) {
      supabaseQuery = supabaseQuery.lte('jump_date', query.date_to);
    }

    // Order by jump date, then by created_at as secondary sort
    supabaseQuery = supabaseQuery
      .order('jump_date', { ascending: query.order === 'asc' })
      .order('created_at', { ascending: query.order === 'asc' })
      .range(query.offset, query.offset + query.limit - 1);

    const { data: entries, error } = await supabaseQuery;

    console.log('📊 Supabase logbook entries response:', { 
      data: entries?.length || 0, 
      error 
    });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error fetching logbook entries:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch logbook entries',
      });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('logbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authenticatedRequest.user.id);

    if (countError) {
      console.log('⚠️ Error getting total count:', countError.message);
    }

    const hasMore = (totalCount || 0) > query.offset + query.limit;

    console.log('✅ Returned', entries?.length || 0, 'logbook entries');

    return reply.send({
      success: true,
      data: {
        entries: entries || [],
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

    request.log.error('Error in logbook entries endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function LogbookGet(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: LogbookQuery;
  }>('/logbook', {
    schema: logbookFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}
