// src/routes/profile.get.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';

const profileFastifySchema = {
  description: 'Get current user profile',
  tags: ['auth'],
  security: [{ bearerAuth: [] }],
};

// Handler function - same pattern as locations/signin
async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('👤 Getting profile for user:', authenticatedRequest.user.id);

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authenticatedRequest.user.id)
      .single();

    console.log('📊 Supabase profile response:', { data: !!profile, error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error fetching profile:', error);
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

    console.log('✅ Profile retrieved successfully');

    // Return simple response
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
  // GET /profile (with authentication)
  fastify.get('/profile', {
    schema: profileFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}