import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseClient } from '../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const signOutFastifySchema = {
  description: 'Sign out current user',
  tags: ['auth'],
  security: [{ bearerAuth: [] }],
};

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    console.log('👋 Signing out user:', authenticatedRequest.user.id);

    console.log(supabaseClient);
    
    // Sign out with Supabase
    const { error } = await supabaseClient.auth.signOut();

    console.log('📊 Supabase signout response:', { error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error signing out:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Sign out failed' 
      });
    }

    console.log('✅ Sign out successful');

    // Return simple response
    return reply.send({
      success: true,
      message: 'Successfully signed out',
    });

  } catch (error) {
    request.log.error('Error in signout endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function SignOutPost(fastify: FastifyInstance) {
  fastify.post('/signout', {
    schema: signOutFastifySchema,
    preHandler: authenticateUser,
    handler: prod
  });
}