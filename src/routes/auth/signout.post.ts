import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseClient } from '../../services/supabase';
import { authenticateUser } from '../../middleware/auth';
import { signOutFastifySchema } from '../../schemas/auth/signout';

async function prod(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Sign out with Supabase
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      request.log.error('Error signing out:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Sign out failed' 
      });
    }

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