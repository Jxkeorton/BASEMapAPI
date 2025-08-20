import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../../services/supabase';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../../../middleware/auth';

// Validation schemas
const submissionParamsSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID format')
});

const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be approved or rejected'
  }),
  admin_notes: z.string().optional(),
  // For approved submissions, optionally override submission data
  override_data: z.object({
    name: z.string().min(1).optional(),
    country: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    rock_drop_ft: z.number().int().positive().optional(),
    total_height_ft: z.number().int().positive().optional(),
    cliff_aspect: z.string().optional(),
    anchor_info: z.string().optional(),
    access_info: z.string().optional(),
    notes: z.string().optional(),
    opened_by_name: z.string().optional(),
    opened_date: z.string().optional(),
    video_link: z.string().url().optional().or(z.literal(''))
  }).optional()
});

type SubmissionParams = z.infer<typeof submissionParamsSchema>;
type ReviewSubmissionBody = z.infer<typeof reviewSubmissionSchema>;

const reviewSubmissionFastifySchema = {
  description: 'Review a location submission (approve or reject)',
  tags: ['admin', 'submissions'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      submissionId: { type: 'string', format: 'uuid' }
    },
    required: ['submissionId']
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { 
        type: 'string', 
        enum: ['approved', 'rejected'],
        description: 'Review decision' 
      },
      admin_notes: { 
        type: 'string',
        description: 'Optional admin notes/feedback' 
      },
      override_data: {
        type: 'object',
        description: 'Optional data overrides for approved submissions',
        properties: {
          name: { type: 'string', minLength: 1 },
          country: { type: 'string' },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          rock_drop_ft: { type: 'integer', minimum: 1 },
          total_height_ft: { type: 'integer', minimum: 1 },
          cliff_aspect: { type: 'string' },
          anchor_info: { type: 'string' },
          access_info: { type: 'string' },
          notes: { type: 'string' },
          opened_by_name: { type: 'string' },
          opened_date: { type: 'string' },
          video_link: { type: 'string', format: 'uri' }
        }
      }
    }
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
            submission: { type: 'object' },
            created_location: { type: 'object' },
            updated_location: { type: 'object' }
          }
        }
      }
    }
  }
};

async function reviewSubmission(
  request: FastifyRequest<{ Params: SubmissionParams; Body: ReviewSubmissionBody }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { submissionId } = submissionParamsSchema.parse(request.params);
    const reviewData = reviewSubmissionSchema.parse(request.body);
    
    // First, get the submission with all related data
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('location_submission_requests')
      .select(`
        *,
        location_submission_images (
          id,
          image_url,
          image_order
        ),
        existing_location:existing_location_id (
          id,
          name,
          country
        )
      `)
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw fetchError || new Error('Submission not found');
    }

    // Check if submission is still pending
    if (submission.status !== 'pending') {
      throw new Error(`Submission already ${submission.status}`);
    }

    let createdLocation = null;
    let updatedLocation = null;

    // If approved, create or update the location
    if (reviewData.status === 'approved') {
      // Prepare location data (use override_data if provided, otherwise submission data)
      const locationData = {
        name: reviewData.override_data?.name || submission.name,
        country: reviewData.override_data?.country || submission.country,
        latitude: reviewData.override_data?.latitude || submission.latitude,
        longitude: reviewData.override_data?.longitude || submission.longitude,
        rock_drop_ft: reviewData.override_data?.rock_drop_ft || submission.rock_drop_ft,
        total_height_ft: reviewData.override_data?.total_height_ft || submission.total_height_ft,
        cliff_aspect: reviewData.override_data?.cliff_aspect || submission.cliff_aspect,
        anchor_info: reviewData.override_data?.anchor_info || submission.anchor_info,
        access_info: reviewData.override_data?.access_info || submission.access_info,
        notes: reviewData.override_data?.notes || submission.notes,
        opened_by_name: reviewData.override_data?.opened_by_name || submission.opened_by_name,
        opened_date: reviewData.override_data?.opened_date || submission.opened_date,
        video_link: reviewData.override_data?.video_link || submission.video_link,
      };

      if (submission.submission_type === 'new') {
        // Create new location
        const { data: newLocation, error: createError } = await supabaseAdmin
          .from('locations')
          .insert([locationData])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        createdLocation = newLocation;

      } else if (submission.submission_type === 'update' && submission.existing_location_id) {
        // Update existing location
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('locations')
          .update(locationData)
          .eq('id', submission.existing_location_id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        updatedLocation = updated;
      }
    }

    // Update the submission status
    const { data: updatedSubmission, error: updateError } = await supabaseAdmin
      .from('location_submission_requests')
      .update({
        status: reviewData.status,
        admin_notes: reviewData.admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authenticatedRequest.user.id
      })
      .eq('id', submissionId)
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        location_submission_images (
          id,
          image_url,
          image_order
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    const message = reviewData.status === 'approved' 
      ? `Submission approved${createdLocation ? ' and location created' : updatedLocation ? ' and location updated' : ''}`
      : 'Submission rejected';

    return reply.send({
      success: true,
      message,
      data: {
        submission: updatedSubmission,
        ...(createdLocation && { created_location: createdLocation }),
        ...(updatedLocation && { updated_location: updatedLocation })
      }
    });

  } catch (error) {
    request.log.error('Error in reviewSubmission:', error);
    throw error;
  }
}

export default async function SubmissionsPatch(fastify: FastifyInstance) {
  fastify.patch('/admin/submissions/:submissionId', {
    schema: reviewSubmissionFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: reviewSubmission
  });
}