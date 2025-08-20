import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../../services/supabase';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../../../middleware/auth';

const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rock_drop_ft: z.number().int().positive().optional(),
  total_height_ft: z.number().int().positive().optional(),
  cliff_aspect: z.string().optional(),
  anchor_info: z.string().optional(),
  access_info: z.string().optional(),
  notes: z.string().optional(),
  opened_by_name: z.string().optional(),
  opened_date: z.string().optional(),
  video_link: z.string().url().optional().or(z.literal('')),
  is_hidden: z.boolean().optional().default(false)
});

type CreateLocationBody = z.infer<typeof createLocationSchema>;

const createLocationFastifySchema = {
  description: 'Create a new BASE jumping location (Admin only)',
  tags: ['admin', 'locations'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'latitude', 'longitude'],
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
      is_hidden: { type: 'boolean', default: false }
    }
  }
};

// Create new location (Admin+ only)
async function createLocation(
  request: FastifyRequest<{ Body: CreateLocationBody }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    // Validate request body
    const locationData = createLocationSchema.parse(request.body);

    // Insert into database
    const { data: newLocation, error } = await supabaseAdmin
      .from('locations')
      .insert([{
        ...locationData,
        created_by: authenticatedRequest.user?.id,
        updated_by: authenticatedRequest.user?.id 
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return reply.code(201).send({
      success: true,
      message: 'Location created successfully',
      data: newLocation
    });

  } catch (error) {
    request.log.error('Error in createLocation:', error);
    throw error;
  }
}

export default async function LocationsPost(fastify: FastifyInstance) {
  fastify.post('/admin/locations', {
    schema: createLocationFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: createLocation
  });
}