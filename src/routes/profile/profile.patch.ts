import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const updateProfileBodySchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(100, 'Name too long').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters').optional(),
  jump_number: z.number().min(0, 'Jump number must be positive').max(10000, 'Jump number seems unrealistic').optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

const updateProfileFastifySchema = {
  description: 'Update current user profile',
  tags: ['profile'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100, description: 'Display name' },
      username: { type: 'string', minLength: 3, maxLength: 30, description: 'Unique username' },
      jump_number: { type: 'number', minimum: 0, maximum: 10000, description: 'Total BASE jumps completed' },
    },
    minProperties: 1,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string', nullable: true },
            username: { type: 'string', nullable: true },
            jump_number: { type: 'number' },
            updated_at: { type: 'string' },
          },
        },
      },
    },
  },
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    // Validate request body
    const updates = updateProfileBodySchema.parse(request.body);

    // Check if username is being updated and is already taken
    if (updates.username) {
      
      const { data: existingUser, error: usernameError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', updates.username)
        .neq('id', authenticatedRequest.user.id)
        .single();

      if (existingUser && !usernameError) {
        return reply.code(400).send({
          success: false,
          error: 'Username already taken',
        });
      }

      if (usernameError && usernameError.code !== 'PGRST116') {
        return reply.code(500).send({
          success: false,
          error: 'Failed to verify username availability',
        });
      }
    }

    // Update profile in database
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authenticatedRequest.user.id)
      .select('id, email, name, username, jump_number, updated_at')
      .single();

    if (error) {
      request.log.error('Error updating profile:', error);
      throw error;
    }

    // Return simple response
    return reply.send({
      success: true,
      data: updatedProfile,
    });

  } catch (error) {
    request.log.error('Error in profile update endpoint:', error);
    throw error;
  }
}

export default async function ProfilePatch(fastify: FastifyInstance) {
  fastify.patch<{
    Body: UpdateProfileBody;
  }>('/profile', {
    schema: updateProfileFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}