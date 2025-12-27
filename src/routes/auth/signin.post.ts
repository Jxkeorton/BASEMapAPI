import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { signInFastifySchema } from '../../schemas/auth/signIn';
import { supabaseClient } from '../../services/supabase';

const signInBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInBody = z.infer<typeof signInBodySchema>;

// Handler function - same pattern as locations
async function prod(request: FastifyRequest<{ Body: SignInBody }>, reply: FastifyReply) {
  try {
    // Validate request body
    const body = signInBodySchema.parse(request.body);

    // Attempt to sign in with Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      throw error;
    }

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
    request.log.error('Error in signin endpoint:', error);
    throw error;
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