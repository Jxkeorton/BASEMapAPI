import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../services/supabase';

const signInBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInBody = z.infer<typeof signInBodySchema>;

const signInFastifySchema = {
  description: 'Sign in with email and password',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email' },
      password: { type: 'string', minLength: 6, description: 'User password' },
    },
  }
};

// Handler function - same pattern as locations
async function prod(request: FastifyRequest<{ Body: SignInBody }>, reply: FastifyReply) {
  try {
    console.log('🔐 Sign in attempt for:', request.body.email);

    // Validate request body
    const body = signInBodySchema.parse(request.body);

    console.log(body);
    
    // Attempt to sign in with Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    console.log('📊 Supabase auth response:', { data: !!data.user, error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error signing in:', error);
      
      // Check if it's an email confirmation error using the error code
      if (error.code === 'email_not_confirmed') {
        return reply.code(401).send({
          success: false,
          error: 'Please confirm your email address before signing in. Check your inbox for a confirmation email.',
          emailUnconfirmed: true,
        });
      }

      if (!data.user || !data.session) {
        return reply.code(400).send({
          success: false,
          error: 'Sign in failed - no user data returned',
        });
      }
      
      // For all other authentication errors
      return reply.code(401).send({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Return simple response
    return reply.send({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    
    request.log.error('Error in signin endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function SignInPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: SignInBody;
  }>('/signin', {
    schema: signInFastifySchema,
    handler: prod
  });
}