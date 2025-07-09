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
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
        details: { type: 'array' },
      },
    },
  },
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('📝 Profile update request for user:', authenticatedRequest.user.id);

    // Validate request body
    const updates = updateProfileBodySchema.parse(request.body);

    console.log(supabaseAdmin);
    
    // Check if username is being updated and is already taken
    if (updates.username) {
      console.log('🔍 Checking if username is available:', updates.username);
      
      const { data: existingUser, error: usernameError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', updates.username)
        .neq('id', authenticatedRequest.user.id)
        .single();

      console.log('📊 Username check response:', { data: !!existingUser, error: usernameError?.code });

      if (existingUser && !usernameError) {
        console.log('❌ Username already taken:', updates.username);
        return reply.code(400).send({
          success: false,
          error: 'Username already taken',
        });
      }

      if (usernameError && usernameError.code !== 'PGRST116') {
        console.log('❌ Error checking username:', usernameError.message);
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

    console.log('📊 Supabase profile update response:', { data: !!updatedProfile, error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error updating profile:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update profile',
      });
    }

    console.log('✅ Profile updated successfully');

    // Return simple response
    return reply.send({
      success: true,
      data: updatedProfile,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in profile update endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function ProfilePatch(fastify: FastifyInstance) {
  // PATCH /profile
  fastify.patch<{
    Body: UpdateProfileBody;
  }>('/profile', {
    schema: updateProfileFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}