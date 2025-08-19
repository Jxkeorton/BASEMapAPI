import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const updateSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
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
  video_link: z.string().url().optional().or(z.literal('')),
  image_urls: z.array(z.string().url()).optional()
});

type UpdateSubmissionBody = z.infer<typeof updateSubmissionSchema>;

const updateSubmissionFastifySchema = {
  description: 'Update a pending submission',
  tags: ['locations'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  },
  body: {
    type: 'object',
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
      video_link: { type: 'string', format: 'uri' },
      image_urls: { type: 'array', items: { type: 'string', format: 'uri' } }
    }
  }
};

async function updateSubmission(
  request: FastifyRequest<{ 
    Params: { id: string }, 
    Body: UpdateSubmissionBody 
  }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { id } = request.params;
    const updateData = updateSubmissionSchema.parse(request.body);

    // Check if submission exists and belongs to user and is pending
    const { data: existingSubmission, error: fetchError } = await supabaseAdmin
      .from('location_submission_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', authenticatedRequest.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !existingSubmission) {
      return reply.code(404).send({
        success: false,
        error: 'Submission not found or cannot be updated'
      });
    }

    // Prepare update object (only include provided fields)
    const submissionUpdate: any = {
      updated_at: new Date().toISOString()
    };

    // Add only the fields that were provided
    Object.keys(updateData).forEach(key => {
      if (key !== 'image_urls' && updateData[key as keyof UpdateSubmissionBody] !== undefined) {
        submissionUpdate[key] = updateData[key as keyof UpdateSubmissionBody];
      }
    });

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabaseAdmin
      .from('location_submission_requests')
      .update(submissionUpdate)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to update submission',
        details: updateError.message
      });
    }

    // Handle image updates if provided
    if (updateData.image_urls !== undefined) {
      // Delete existing images
      const { error: deleteError } = await supabaseAdmin
        .from('location_submission_images')
        .delete()
        .eq('submission_id', id);

      if (deleteError) {
        request.log.error('⚠️ Warning: Failed to delete old images:', deleteError.message);
      }

      // Insert new images
      if (updateData.image_urls.length > 0) {
        const imageRecords = updateData.image_urls.map((url, index) => ({
          submission_id: id,
          image_url: url,
          image_order: index
        }));

        const { error: imageError } = await supabaseAdmin
          .from('location_submission_images')
          .insert(imageRecords);

        if (imageError) {
          request.log.error('⚠️ Warning: Failed to save new images:', imageError.message);
        } else {
          request.log.info('✅ Updated', imageRecords.length, 'images for submission');
        }
      }
    }

    return reply.send({
      success: true,
      message: 'Submission updated successfully',
      data: updatedSubmission
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid update data',
        details: error.errors
      });
    }

    request.log.error('Error in updateSubmission:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default async function SubmissionsPatch(fastify: FastifyInstance) {
  fastify.patch<{
    Params: { id: string },
    Body: UpdateSubmissionBody;
  }>('/locations/submissions/:id', {
    schema: updateSubmissionFastifySchema,
    preHandler: authenticateUser,
    handler: updateSubmission
  });
}