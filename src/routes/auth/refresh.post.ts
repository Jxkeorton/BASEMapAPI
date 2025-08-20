import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../services/supabase';
import { refreshFastifySchema } from '../../schemas/auth/refresh';

const refreshBodySchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

type RefreshBody = z.infer<typeof refreshBodySchema>;

async function prod(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
  try {
    // Validate request body
    const body = refreshBodySchema.parse(request.body);
    
    // Refresh session with Supabase
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token: body.refresh_token,
    });

    if (error) {
      request.log.error('Error refreshing token:', error);
      throw error;
    }

    if (!data.session) {
      throw new Error('Failed to refresh session');
    }

    return reply.send({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
    });

  } catch (error) {
    request.log.error('Error in refresh endpoint:', error);
    throw error;
  }
}

export default async function RefreshPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: RefreshBody;
  }>('/refresh', {
    schema: refreshFastifySchema,
    handler: prod
  });
}