import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';
import { ProfileResponseData } from '../../schemas/profile';

const profileFastifySchema = {
  description: 'Get current user profile with role information',
  tags: ['auth'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: ProfileResponseData
      }
    }
  }
};

async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('👤 Getting profile for user:', authenticatedRequest.user.id);

    // Profile should already be attached by authenticateUser middleware
    if (authenticatedRequest.profile) {
      console.log('✅ Using cached profile from middleware');
      return reply.send({
        success: true,
        data: authenticatedRequest.profile,
      });
    }

    // Fallback: fetch profile if not cached
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authenticatedRequest.user.id)
      .single();

    if (error) {
      console.log('❌ Error fetching profile:', error.message);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch profile' 
      });
    }

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: 'Profile not found',
      });
    }

    console.log('✅ Profile retrieved successfully, role:', profile.role);

    return reply.send({
      success: true,
      data: profile,
    });

  } catch (error) {
    request.log.error('Error in profile endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function ProfileGet(fastify: FastifyInstance) {
  fastify.get('/profile', {
    schema: profileFastifySchema,
    preHandler: authenticateUser,
    handler: getProfile
  });
}