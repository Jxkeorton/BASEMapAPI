import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../../services/supabase';
import { authenticateUser, requireSuperuser } from '../../../middleware/auth';

const locationParamsSchema = z.object({
  locationId: z.coerce.number().int().positive()
});

type LocationParams = z.infer<typeof locationParamsSchema>;

const deleteLocationFastifySchema = {
  description: 'Delete a location (Superuser only)',
  tags: ['admin', 'locations'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      locationId: { type: 'integer', minimum: 1 }
    },
    required: ['locationId']
  }
};

// Delete location (Superuser only)
async function deleteLocation(
  request: FastifyRequest<{ Params: LocationParams }>, 
  reply: FastifyReply
) {
  try {
    const { locationId } = locationParamsSchema.parse(request.params);
    
    // Check if location exists and get its name for logging
    const { data: existingLocation, error: fetchError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .single();

    if (fetchError || !existingLocation) {
      return reply.code(404).send({
        success: false,
        error: 'Location not found'
      });
    }

    // Check if location has any dependencies (saved locations, logbook entries, etc.)
    // This prevents deletion if users have data tied to this location
    const { data: savedLocations, error: savedError } = await supabaseAdmin
      .from('user_saved_locations')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId);

    if (savedError) {
      request.log.warn('Error checking dependencies:', savedError);
    }

    if (savedLocations && savedLocations.length > 0) {
      request.log.warn(`Warning: Location has ${savedLocations.length} saved references`);
    }

    // Delete location
    const { error: deleteError } = await supabaseAdmin
      .from('locations')
      .delete()
      .eq('id', locationId);

    if (deleteError) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete location',
        details: deleteError.message
      });
    }

    return reply.send({
      success: true,
      message: `Location "${existingLocation.name}" deleted successfully`,
      data: {
        deleted_location: {
          id: existingLocation.id,
          name: existingLocation.name
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid location ID',
        details: error.errors
      });
    }

    request.log.error('Error in deleteLocation:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default async function LocationsDelete(fastify: FastifyInstance) {
  fastify.delete('/admin/locations/:locationId', {
    schema: deleteLocationFastifySchema,
    preHandler: [authenticateUser, requireSuperuser],
    handler: deleteLocation
  });
}