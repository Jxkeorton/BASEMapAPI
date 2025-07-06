import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../services/supabase';

const signUpBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

type SignUpBody = z.infer<typeof signUpBodySchema>;

const signUpFastifySchema = {
  description: 'Sign up with email and password',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email' },
      password: { type: 'string', minLength: 6, description: 'User password' },
      name: { type: 'string', minLength: 1, description: 'User display name' },
    },
  }
};

// Handler function - same pattern as signin
async function prod(request: FastifyRequest<{ Body: SignUpBody }>, reply: FastifyReply) {
  try {
    console.log('📝 Sign up attempt for:', request.body.email);

    // Validate request body
    const body = signUpBodySchema.parse(request.body);

    console.log(supabaseClient);
    
    // Attempt to sign up with Supabase
    const { data, error } = await supabaseClient.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name || body.email.split('@')[0],
        },
      },
    });

    console.log('📊 Supabase auth response:', { data: !!data.user, error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error signing up:', error);
      
      // Handle specific error cases
      if (error.message.includes('User already registered')) {
        return reply.code(400).send({
          success: false,
          error: 'An account with this email already exists',
        });
      }
      
      return reply.code(400).send({ 
        success: false, 
        error: error.message 
      });
    }

    if (!data.user) {
      return reply.code(400).send({
        success: false,
        error: 'Sign up failed - no user data returned',
      });
    }

    // Check if email confirmation is required
    const requiresConfirmation = !data.session;
    const message = requiresConfirmation 
      ? 'Account created successfully! Please check your email to confirm your account.'
      : 'Account created successfully!';

    // Return simple response
    return reply.send({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        } : null,
        message,
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
    
    request.log.error('Error in signup endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function SignUpPost(fastify: FastifyInstance) {
  // POST /signup
  fastify.post<{
    Body: SignUpBody;
  }>('/signup', {
    schema: signUpFastifySchema,
    handler: prod
  });
}