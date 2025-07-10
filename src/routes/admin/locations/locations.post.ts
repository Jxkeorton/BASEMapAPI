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
  video_link: z.string().url().optional().or(z.literal(''))
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
      video_link: { type: 'string', format: 'uri' }
    }
  }
};

// Create new location (Admin+ only)
async function createLocation(
  request: FastifyRequest<{ Body: CreateLocationBody }>, 
  reply: FastifyReply
) {
  try {
    console.log('📍 Admin creating new location...');

    // Validate request body
    const locationData = createLocationSchema.parse(request.body);

    // Insert into database
    const { data: newLocation, error } = await supabaseAdmin
      .from('locations')
      .insert([locationData])
      .select()
      .single();

    if (error) {
      console.log('❌ Error creating location:', error.message);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create location',
        details: error.message
      });
    }

    console.log('✅ Location created successfully:', newLocation.name);

    return reply.code(201).send({
      success: true,
      message: 'Location created successfully',
      data: newLocation
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid location data',
        details: error.errors
      });
    }

    request.log.error('Error in createLocation:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default async function LocationsPost(fastify: FastifyInstance) {
  fastify.post('/admin/locations', {
    schema: createLocationFastifySchema,
    preHandler: [authenticateUser, requireAdmin],
    handler: createLocation
  });
}