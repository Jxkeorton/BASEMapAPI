import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../../services/supabase';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../../../middleware/auth';

// Validation schemas
const updateLocationSchema = z.object({
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
  is_hidden: z.boolean().optional()
});

const locationParamsSchema = z.object({
  locationId: z.coerce.number().int().positive()
});

type UpdateLocationBody = z.infer<typeof updateLocationSchema>;
type LocationParams = z.infer<typeof locationParamsSchema>;

const updateLocationFastifySchema = {
  description: 'Update an existing location (Admin only)',
  tags: ['admin', 'locations'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      locationId: { type: 'integer', minimum: 1 }
    },
    required: ['locationId']
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
      is_hidden: { type: 'boolean' }
    }
  }
};

async function updateLocation(
  request: FastifyRequest<{ Params: LocationParams; Body: UpdateLocationBody }>, 
  reply: FastifyReply
) {
  try {
    const { locationId } = locationParamsSchema.parse(request.params);
    
    const authenticatedRequest = request as AuthenticatedRequest;

    // Validate request body
    const updateData = updateLocationSchema.parse(request.body);

    // Check if there's actually data to update
    if (Object.keys(updateData).length === 0) {
      throw new Error('No update data provided');
    }

    // Check if location exists
    const { data: existingLocation, error: fetchError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .single();

    if (fetchError || !existingLocation) {
      throw fetchError || new Error('Location not found');
    }

    // Update location
    const { data: updatedLocation, error: updateError } = await supabaseAdmin
      .from('locations')
            .update({
        ...updateData,
        updated_by: authenticatedRequest.user?.id // Set updated_by from authenticated user
      })
      .eq('id', locationId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return reply.send({
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation
    });

  } catch (error) {
    request.log.error('Error in updateLocation:', error);
    throw error;
  }
}

export default async function LocationsPatch(fastify: FastifyInstance) {
  fastify.patch('/admin/locations/:locationId', {
    schema: updateLocationFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: updateLocation
  });
}