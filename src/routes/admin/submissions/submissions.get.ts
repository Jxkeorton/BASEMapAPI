import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../../services/supabase';
import { authenticateUser, requireAdmin } from '../../../middleware/auth';

// Query validation schema
const submissionsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  submission_type: z.enum(['new', 'update']).optional(),
  user_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sort_by: z.enum(['created_at', 'name', 'status']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

type SubmissionsQuery = z.infer<typeof submissionsQuerySchema>;

const submissionsFastifySchema = {
  description: 'Get all location submissions for admin review',
  tags: ['admin', 'submissions'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      status: { 
        type: 'string', 
        enum: ['pending', 'approved', 'rejected'],
        description: 'Filter by submission status' 
      },
      submission_type: { 
        type: 'string', 
        enum: ['new', 'update'],
        description: 'Filter by submission type' 
      },
      user_id: { 
        type: 'string', 
        format: 'uuid',
        description: 'Filter by user ID' 
      },
      limit: { 
        type: 'number', 
        minimum: 1, 
        maximum: 100, 
        default: 50,
        description: 'Number of submissions to return' 
      },
      offset: { 
        type: 'number', 
        minimum: 0, 
        default: 0,
        description: 'Number of submissions to skip' 
      },
      sort_by: { 
        type: 'string', 
        enum: ['created_at', 'name', 'status'],
        default: 'created_at',
        description: 'Field to sort by' 
      },
      sort_order: { 
        type: 'string', 
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order' 
      },
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
            submissions: { type: 'array' },
            total_count: { type: 'number' },
            has_more: { type: 'boolean' },
            summary: {
              type: 'object',
              properties: {
                pending: { type: 'number' },
                approved: { type: 'number' },
                rejected: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
};

async function getSubmissions(
  request: FastifyRequest<{ Querystring: SubmissionsQuery }>, 
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const query = submissionsQuerySchema.parse(request.query);

    // Build the select query with related data
    let supabaseQuery = supabaseAdmin
      .from('location_submission_requests')
      .select(`
        id,
        user_id,
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
        status,
        submission_type,
        existing_location_id,
        admin_notes,
        created_at,
        updated_at,
        reviewed_at,
        reviewed_by,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        existing_location:existing_location_id (
          id,
          name,
          country
        ),
        location_submission_images (
          id,
          image_url,
          image_order
        )
      `);

    // Apply filters
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }
    
    if (query.submission_type) {
      supabaseQuery = supabaseQuery.eq('submission_type', query.submission_type);
    }
    
    if (query.user_id) {
      supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(query.sort_by, { 
      ascending: query.sort_order === 'asc' 
    });

    // Apply pagination
    supabaseQuery = supabaseQuery.range(
      query.offset, 
      query.offset + query.limit - 1
    );

    const { data: submissions, error } = await supabaseQuery;

    if (error) {
      request.log.error('Error fetching submissions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch submissions',
        details: error.message
      });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('location_submission_requests')
      .select('*', { count: 'exact', head: true });
    
    // Apply same filters for count
    if (query.status) {
      countQuery = countQuery.eq('status', query.status);
    }
    if (query.submission_type) {
      countQuery = countQuery.eq('submission_type', query.submission_type);
    }
    if (query.user_id) {
      countQuery = countQuery.eq('user_id', query.user_id);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      request.log.warn({ msg: 'Error getting total count', error: countError.message });
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('location_submission_requests')
      .select('status');

    let summary = { pending: 0, approved: 0, rejected: 0 };
    if (!summaryError && summaryData) {
      summary = summaryData.reduce((acc, submission) => {
        const status = submission.status as keyof typeof acc;
        if (status in acc) {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, { pending: 0, approved: 0, rejected: 0 });
    }

    const hasMore = (totalCount || 0) > query.offset + query.limit;

    return reply.send({
      success: true,
      data: {
        submissions: submissions || [],
        total_count: totalCount || 0,
        has_more: hasMore,
        summary,
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

    request.log.error('Error in submissions endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function SubmissionsGet(fastify: FastifyInstance) {
  fastify.get('/admin/submissions', {
    schema: submissionsFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: getSubmissions
  });
}