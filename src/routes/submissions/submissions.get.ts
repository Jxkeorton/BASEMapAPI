import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';
import { SubmissionsResponseData } from '../../schemas/submissions';

const getSubmissionsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  submission_type: z.enum(['new', 'update']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

type GetSubmissionsQuery = z.infer<typeof getSubmissionsQuerySchema>;

const getSubmissionsFastifySchema = {
  description: 'Get user submission requests',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      submission_type: { type: 'string', enum: ['new', 'update'] },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'number', minimum: 0, default: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: SubmissionsResponseData
      }
    }
  }
};

async function getUserSubmissions(
  request: FastifyRequest<{ Querystring: GetSubmissionsQuery }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const query = getSubmissionsQuerySchema.parse(request.query);

    console.log('📋 Getting user submissions for:', authenticatedRequest.user.id);

    // Build query
    let supabaseQuery = supabaseAdmin
      .from('location_submission_requests')
      .select(`
        *,
        location_submission_images(image_url, image_order),
        locations(name)
      `)
      .eq('user_id', authenticatedRequest.user.id)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    // Apply filters
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.submission_type) {
      supabaseQuery = supabaseQuery.eq('submission_type', query.submission_type);
    }

    const { data: submissions, error } = await supabaseQuery;

    if (error) {
      console.log('❌ Error fetching submissions:', error.message);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch submissions'
      });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('location_submission_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authenticatedRequest.user.id);

    if (query.status) countQuery = countQuery.eq('status', query.status);
    if (query.submission_type) countQuery = countQuery.eq('submission_type', query.submission_type);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.log('⚠️ Error getting total count:', countError.message);
    }

    // Transform data to flatten structure and sort images
    const transformedSubmissions = (submissions || []).map(submission => ({
      ...submission,
      images: (submission.location_submission_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url),
      existing_location_name: submission.locations?.name || null,
      // Remove the nested objects from response
      location_submission_images: undefined,
      locations: undefined
    }));

    const hasMore = (count || 0) > query.offset + query.limit;

    console.log('✅ Returned', transformedSubmissions.length, 'submissions');

    return reply.send({
      success: true,
      data: {
        submissions: transformedSubmissions,
        total_count: count || 0,
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

    request.log.error('Error in getUserSubmissions:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function SubmissionsGet(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetSubmissionsQuery;
  }>('/locations/submissions', {
    schema: getSubmissionsFastifySchema,
    preHandler: authenticateUser,
    handler: getUserSubmissions
  });
}
